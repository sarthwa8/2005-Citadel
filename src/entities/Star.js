import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { makeGlowSprite } from '../core/glow.js'

// HELIOS — the system's star. Uses a textured GLB model (auto-normalized to
// SUN_RADIUS) instead of the old procedural shader sphere, which read as a
// featureless white blob once bloom amplified it. A faint additive corona gives
// the limb a soft halo, and the scene PointLight is intentionally moderate so the
// planets are lit without being washed out.
const SUN_RADIUS = 24

export class Star {
  constructor() {
    this.group = new THREE.Group()
    this.ready = false

    // Spin group so the sun rotates slowly without moving the light/corona.
    this.spin = new THREE.Group()
    this.group.add(this.spin)

    // Soft diffuse corona — a camera-facing halo that fades naturally into space
    // (a layered pair: a tight warm core glow + a broad faint outer wash).
    this.coronaInner = makeGlowSprite(0xFFC070, SUN_RADIUS * 3.0, 0.55)
    this.coronaOuter = makeGlowSprite(0xE89048, SUN_RADIUS * 6.5, 0.22)
    this.group.add(this.coronaInner, this.coronaOuter)

    // Primary scene light — warm, moderate. distance=0 (no cutoff), decay=1.2 so it
    // still reaches CODEX/NOVARA at r=285; intensity dialled down from the old 200
    // so planets read as worlds, not over-exposed.
    this.light = new THREE.PointLight(0xFFD9A0, 150, 0, 1.2)
    this.group.add(this.light)

    const loader = new GLTFLoader()
    loader.load(
      '/models/uploads_files_4395783_Sun.glb',
      gltf => this._onLoad(gltf),
      undefined,
      err => console.error('[Star] GLTF load failed:', err),
    )
  }

  _onLoad(gltf) {
    const model = gltf.scene

    // Auto-normalize: recenter + uniform-scale so the sun's diameter = SUN_RADIUS*2,
    // regardless of the export's native units.
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3();   box.getSize(size)
    const center = new THREE.Vector3(); box.getCenter(center)
    const longest = Math.max(size.x, size.y, size.z) || 1
    const s = (SUN_RADIUS * 2) / longest
    model.scale.setScalar(s)
    model.position.copy(center).multiplyScalar(-s)

    model.traverse(n => {
      if (n.isMesh && n.material) {
        // Make the surface self-lit and warm: reuse the colour map as an emissive
        // map so the sun glows with its own texture and blooms like a star, but
        // still shows surface detail instead of clipping to flat white.
        const m = n.material
        if (m.map) {
          m.emissiveMap = m.map
          m.emissive = new THREE.Color(0xffffff)
        } else {
          m.emissive = new THREE.Color(0xFFB347)
        }
        m.emissiveIntensity = 0.85
        m.needsUpdate = true
      }
    })

    this.spin.add(model)
    this.model = model
    this.ready = true
  }

  update(elapsed) {
    this.spin.rotation.y = elapsed * 0.02
    // Subtle corona breathing
    this.coronaInner.material.opacity = 0.52 + 0.06 * Math.sin(elapsed * 0.7)
    this.coronaOuter.material.opacity = 0.20 + 0.04 * Math.sin(elapsed * 0.5 + 1.0)
  }
}
