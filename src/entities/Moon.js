import * as THREE from 'three'
import { gsap } from 'gsap'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import * as AudioSystem from '../systems/AudioSystem.js'

// A small sphere orbiting a parent planet. Starts LOCKED (dim + ghosted) until the
// parent planet is scanned, then unlock() reveals it. Added to the parent's
// planetGroup so it inherits the planet's orbit around HELIOS and its axial tilt.
//
// Visibility note: HELIOS is the only real scene light, so a moon on the star-shadowed
// side would render near-black. We give every moon a small emissive floor so it stays
// readable as a glowing node regardless of star angle — dim while locked, brighter once
// unlocked. This keeps "locked moons dim" without letting them disappear entirely.
const LOCKED_OPACITY   = 0.35
const LOCKED_EMISSIVE   = 0.06
const UNLOCKED_EMISSIVE  = 0.18

// Shared rocky surface for every moon — loaded once and reused so flat-coloured
// spheres become cratered worlds. The per-moon colour becomes a faint emissive
// tint (so each still reads with a hint of its theme) rather than a solid fill.
const _texLoader = new THREE.TextureLoader()
const _moonMap = _texLoader.load('/textures/rocks_ground_04_diff_1k.jpg')
_moonMap.colorSpace = THREE.SRGBColorSpace
const _moonNormal = _texLoader.load('/textures/rocks_ground_04_nor_gl_1k.png')

export class Moon {
  constructor(config) {
    this.config = config
    this.locked = config.locked ?? true
    this.orbitAngle = config.orbitAngle ?? 0

    // Group sits on the orbit ring; the mesh + label ride inside it.
    this.group = new THREE.Group()

    const geo = new THREE.SphereGeometry(config.radius, 48, 48)
    this.material = new THREE.MeshStandardMaterial({
      map:               _moonMap,
      normalMap:         _moonNormal,
      normalScale:       new THREE.Vector2(0.8, 0.8),
      color:             0xc8c8c8,                 // light grey so the rock reads naturally
      emissive:          config.color,            // faint thematic glow + dark-side legibility
      emissiveIntensity: this.locked ? LOCKED_EMISSIVE : UNLOCKED_EMISSIVE,
      roughness:         0.95,
      metalness:         0.0,
      transparent:       true,
      opacity:           this.locked ? LOCKED_OPACITY : 1.0,
      // Transparent + depthWrite:false so a ghosted moon never cuts a hole in the
      // planet behind it; depthTest stays on so the opaque planet still occludes it.
      depthWrite:        false,
    })
    this.mesh = new THREE.Mesh(geo, this.material)
    this.group.add(this.mesh)

    // ── CSS2D label — "⬡ LOCKED" until the parent is scanned, then the display name ──
    const div = document.createElement('div')
    div.className = 'moon-label' + (this.locked ? ' locked' : '')
    div.textContent = this.locked ? '⬡ LOCKED' : config.label
    div.style.color = config.labelColor ?? '#9FB4C8'
    this.labelEl = div
    this.label = new CSS2DObject(div)
    this.label.position.set(0, config.radius + 2, 0)
    this.group.add(this.label)

    this._applyOrbitPosition()
  }

  // Called every frame with deltaMs (orbit/rotation speeds are radians-per-ms).
  update(deltaMs) {
    this.orbitAngle += this.config.orbitSpeed * deltaMs
    this._applyOrbitPosition()
    this.mesh.rotation.y += (this.config.rotationSpeed ?? 0.002) * deltaMs
  }

  _applyOrbitPosition() {
    const r = this.config.orbitRadius
    this.group.position.set(
      Math.cos(this.orbitAngle) * r,
      0,
      Math.sin(this.orbitAngle) * r,
    )
  }

  // Called by ScanSystem (Phase 9) when the parent planet is first scanned.
  unlock() {
    if (!this.locked) return
    this.locked = false
    this.labelEl.classList.remove('locked')
    this.labelEl.textContent = this.config.label
    gsap.to(this.material, { opacity: 1.0, duration: 0.8 })
    gsap.to(this.material, { emissiveIntensity: UNLOCKED_EMISSIVE, duration: 0.8 })
    this._spawnUnlockParticles()
    AudioSystem.play('moonUnlock')
  }

  // Brief outward particle burst on unlock. Self-contained: lives on this.group,
  // animates via GSAP, and disposes itself on completion.
  _spawnUnlockParticles() {
    const COUNT = 30
    const positions = new Float32Array(COUNT * 3)   // all start at the moon's center
    const velocities = []
    for (let i = 0; i < COUNT; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1,
      ).normalize().multiplyScalar(2 + Math.random() * 3)
      velocities.push(dir)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: this.config.color, size: 0.5, transparent: true, opacity: 1.0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    })
    const points = new THREE.Points(geo, mat)
    this.group.add(points)

    const burst = { t: 0 }
    gsap.to(burst, {
      t: 1, duration: 0.6, ease: 'power1.out',
      onUpdate: () => {
        const pos = geo.attributes.position
        for (let i = 0; i < COUNT; i++) {
          pos.setXYZ(i, velocities[i].x * burst.t, velocities[i].y * burst.t, velocities[i].z * burst.t)
        }
        pos.needsUpdate = true
        mat.opacity = 1 - burst.t
      },
      onComplete: () => {
        this.group.remove(points)
        geo.dispose()
        mat.dispose()
      },
    })
  }

  // World-space position (used by ProximitySystem in later phases).
  worldPosition() {
    const p = new THREE.Vector3()
    this.group.getWorldPosition(p)
    return p
  }
}
