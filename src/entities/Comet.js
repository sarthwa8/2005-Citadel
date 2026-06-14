import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { state } from '../state.js'
import * as DiscoveryLog from '../ui/DiscoveryLog.js'
import * as AudioSystem from '../systems/AudioSystem.js'

// One-shot comet. Appears APPEAR_DELAY into the session, follows a bezier arc
// through the mid-system over TRAVERSE_MS, then despawns for good. While
// visible it's scannable like any body (Currently Exploring content). Average
// speed ≈ 17 u/s — fast, but catchable at the ship's 25 u/s if the player
// commits to the chase. Ephemeral by design: miss it and it's gone.
//
// Trail: a Points ribbon of TRAIL_COUNT breadcrumbs of the head's recent world
// positions (the group itself never moves — head + trail live in world space).
// Additive blending + a color gradient to black = fade-out without per-point alpha.

export const APPEAR_DELAY_MS = 40000
export const TRAVERSE_MS     = 90000
const TRAIL_COUNT = 140
const JITTER = 0.4

export class Comet {
  constructor() {
    this.config = {
      name: 'COMET', bodyKey: 'COMET',
      radius: 3, scanRadius: 40, labelColor: '#BFE8FF',
    }
    this.done = false
    this.timerMs = 0

    // Entry high on -X/-Z, closest approach ~150 from the star, exit +X/+Z.
    this.curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-650, 110, -350),
      new THREE.Vector3(-180,  50,  -60),
      new THREE.Vector3( 150,  35,  180),
      new THREE.Vector3( 680, 100,  520),
    )

    this.group = new THREE.Group()
    this.group.visible = false

    // ── Head — icy core, bloom-bright ──
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xBFE8FF })
    )
    this.group.add(this.head)

    // ── Label rides the head ──
    const div = document.createElement('div')
    div.className = 'planet-label'
    div.textContent = 'COMET'
    div.style.color = this.config.labelColor
    const label = new CSS2DObject(div)
    label.position.set(0, 5, 0)
    this.head.add(label)

    // ── Trail ──
    this.trailPositions = new Float32Array(TRAIL_COUNT * 3)
    const colors = new Float32Array(TRAIL_COUNT * 3)
    const headC = new THREE.Color(0xBFE8FF)
    const tailC = new THREE.Color(0x103040)
    const c = new THREE.Color()
    for (let i = 0; i < TRAIL_COUNT; i++) {
      // Quadratic falloff reads as a hot core thinning into vapor
      const f = (i / (TRAIL_COUNT - 1)) ** 0.6
      c.lerpColors(headC, tailC, f).multiplyScalar(1 - f * 0.9)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3))
    trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.trail = new THREE.Points(trailGeo, new THREE.PointsMaterial({
      size: 1.3, vertexColors: true, sizeAttenuation: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }))
    this.trail.frustumCulled = false   // breadcrumbs span far beyond any local bounds
    this.group.add(this.trail)
  }

  update(deltaMs) {
    if (this.done) return
    this.timerMs += deltaMs

    if (!state.cometVisible) {
      if (this.timerMs >= APPEAR_DELAY_MS) this._spawn()
      return
    }

    const t = (this.timerMs - APPEAR_DELAY_MS) / TRAVERSE_MS
    if (t >= 1) { this._despawn(); return }

    this.curve.getPoint(t, this.head.position)

    // Shift breadcrumbs back one slot; newest = head position + sparkle jitter
    const p = this.trailPositions
    p.copyWithin(3, 0, (TRAIL_COUNT - 1) * 3)
    p[0] = this.head.position.x + (Math.random() - 0.5) * JITTER
    p[1] = this.head.position.y + (Math.random() - 0.5) * JITTER
    p[2] = this.head.position.z + (Math.random() - 0.5) * JITTER
    this.trail.geometry.attributes.position.needsUpdate = true
  }

  _spawn() {
    state.cometVisible = true
    this.curve.getPoint(0, this.head.position)
    // Collapse the whole trail onto the entry point so no stale ribbon flashes
    for (let i = 0; i < TRAIL_COUNT; i++) {
      this.trailPositions.set([this.head.position.x, this.head.position.y, this.head.position.z], i * 3)
    }
    this.trail.geometry.attributes.position.needsUpdate = true
    this.group.visible = true
    DiscoveryLog.addEntry('◈ COMET DETECTED')
    AudioSystem.play('comet')
  }

  _despawn() {
    state.cometVisible = false
    this.group.visible = false
    this.done = true
  }

  // World-space position (ProximitySystem / scan camera). Group sits at the
  // origin, so the head's local position IS world — but go through the API
  // in case that ever changes.
  worldPosition() {
    const pos = new THREE.Vector3()
    this.head.getWorldPosition(pos)
    return pos
  }
}
