import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

// NOVARA station — the Contact body. Works like a planet for every system:
// orbits HELIOS on its own inclined ring, has a label, a scanRadius, and a
// worldPosition() for Proximity/Scan. Visually it's the space_station GLB
// spinning slowly with pulsing running lights.

// Running-light offsets in normalized station space (model is scaled so its
// bounding radius ≈ config.radius; ±8 puts these near the hull).
const LIGHT_POSITIONS = [
  new THREE.Vector3(-8,  3,  0),
  new THREE.Vector3( 8,  3,  0),
  new THREE.Vector3( 0,  3,  8),
  new THREE.Vector3( 0,  3, -8),
  new THREE.Vector3(-8, -3,  0),
  new THREE.Vector3( 8, -3,  0),
]

const SPIN_SPEED  = 0.08   // rad/s — slow structural rotation (uses elapsed seconds)
const PULSE_SPEED = 1.5
const NORMALIZED_RADIUS = 10   // model is scaled so its bounding sphere ≈ this

export class Station {
  constructor(config) {
    this.config = config
    this.ready = false

    // Same nesting as Planet: orbitGroup rotates on Y to orbit HELIOS;
    // stationGroup sits at orbitRadius and carries everything visible.
    this.orbitGroup = new THREE.Group()
    this.orbitGroup.rotation.y = config.orbitAngle ?? 0
    this.orbitGroup.rotation.x = config.orbitInclination ?? 0

    this.stationGroup = new THREE.Group()
    this.stationGroup.position.x = config.orbitRadius
    this.orbitGroup.add(this.stationGroup)

    // Model + running lights spin together; the label stays outside so the
    // CSS2D anchor point doesn't wobble.
    this.spinGroup = new THREE.Group()
    this.stationGroup.add(this.spinGroup)

    // ── Running lights — alternating teal/amber, bloom-bright, pulsing ──
    this.lights = []
    LIGHT_POSITIONS.forEach((pos, i) => {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0x48C9B0 : 0xF5C840,
          transparent: true, opacity: 1, depthWrite: false,
        })
      )
      light.position.copy(pos)
      this.spinGroup.add(light)
      this.lights.push(light)
    })

    // ── Label ── (labelEl exposed for autopilot click wiring, like Planet)
    const div = document.createElement('div')
    div.className = 'planet-label'
    div.textContent = config.name
    div.style.color = config.labelColor
    this.labelEl = div
    const label = new CSS2DObject(div)
    label.position.set(0, (config.radius ?? NORMALIZED_RADIUS) + 4, 0)
    this.stationGroup.add(label)

    // ── Model ──
    const loader = new GLTFLoader()
    loader.load(
      '/models/space_station.glb',
      gltf => this._onLoad(gltf),
      undefined,
      err => console.error('[Station] GLTF load failed:', err),
    )
  }

  _onLoad(gltf) {
    this.model = gltf.scene

    // Same GLB quirks as the other models: revive zero-scale "hidden" nodes,
    // clamp full-metalness materials that render black without an envMap.
    this.model.traverse(n => {
      if (n.scale && n.scale.x < 0.001 && n.scale.y < 0.001 && n.scale.z < 0.001) {
        n.scale.set(1, 1, 1)
      }
      if (n.isMesh && n.material) {
        n.material.metalness = Math.min(n.material.metalness ?? 0, 0.4)
        n.material.needsUpdate = true
      }
    })

    // Normalize to a known size: bounding sphere radius ≈ NORMALIZED_RADIUS,
    // centered on the group origin, whatever the export's native units were.
    const bb = new THREE.Box3().setFromObject(this.model)
    const sphere = bb.getBoundingSphere(new THREE.Sphere())
    const s = sphere.radius > 1e-6 ? NORMALIZED_RADIUS / sphere.radius : 1
    this.model.scale.setScalar(s)
    this.model.position.copy(sphere.center).multiplyScalar(-s)

    this.spinGroup.add(this.model)
    this.ready = true
  }

  // deltaMs advances the orbit (rad/ms, like planets); elapsed (seconds) drives
  // the structural spin and the running-light pulse.
  update(deltaMs, elapsed) {
    this.config.orbitAngle += this.config.orbitSpeed * deltaMs
    this.orbitGroup.rotation.y = this.config.orbitAngle

    this.spinGroup.rotation.y = elapsed * SPIN_SPEED

    this.lights.forEach((l, i) => {
      l.material.opacity = 0.5 + 0.5 * Math.sin(elapsed * PULSE_SPEED + i * 1.2)
    })
  }

  // World-space position (used by ProximitySystem / scan camera)
  worldPosition() {
    const pos = new THREE.Vector3()
    this.stationGroup.getWorldPosition(pos)
    return pos
  }
}
