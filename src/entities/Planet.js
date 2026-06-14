import * as THREE from 'three'
import { gsap } from 'gsap'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import atmosphereVert from '../shaders/atmosphere.vert.glsl?raw'
import atmosphereFrag from '../shaders/atmosphere.frag.glsl?raw'
import { Moon } from './Moon.js'

const textureLoader = new THREE.TextureLoader()

// Global dampener for the atmosphere rim. The per-planet atmosphereIntensity values
// were tuned bright (they bloomed into star-like halos); this pulls them back to a
// subtle limb glow while keeping each planet's relative strength.
const ATMOSPHERE_SCALE = 0.45

export class Planet {
  constructor(config) {
    this.config = config
    this.moons = []

    // ── Orbit group — Y-rotation orbits HELIOS ─────────────────────────────
    this.orbitGroup = new THREE.Group()
    this.orbitGroup.rotation.y = config.orbitAngle ?? 0
    this.orbitGroup.rotation.x = config.orbitInclination ?? 0

    // ── Planet group — offset to orbitRadius, tilted by axialTilt ──────────
    this.planetGroup = new THREE.Group()
    this.planetGroup.position.x = config.orbitRadius
    this.planetGroup.rotation.z = config.axialTilt ?? 0
    this.orbitGroup.add(this.planetGroup)

    // ── Planet sphere ───────────────────────────────────────────────────────
    const segments = config.isGasGiant ? 64 : 256
    const geo = new THREE.SphereGeometry(config.radius, segments, segments)

    // Color map is sRGB-encoded; r167 defaults textures to NoColorSpace, which
    // would feed it as linear and wash out the surface. Normal/rough/disp stay linear.
    const colorTex = textureLoader.load(config.colorMap)
    colorTex.colorSpace = THREE.SRGBColorSpace

    const mat = new THREE.MeshStandardMaterial({
      map:          colorTex,
      normalMap:    textureLoader.load(config.normalMap),
      normalScale:  config.normalScale ?? new THREE.Vector2(1, 1),
      roughness:    0.85,
      metalness:    0.0,
    })

    if (config.roughnessMap) {
      mat.roughnessMap = textureLoader.load(config.roughnessMap)
    }

    if (!config.isGasGiant && config.displacementMap) {
      mat.displacementMap   = textureLoader.load(config.displacementMap)
      mat.displacementScale = config.displacementScale ?? 0.2
    }

    this.mesh = new THREE.Mesh(geo, mat)
    this.planetGroup.add(this.mesh)

    // ── Atmosphere rim shader ───────────────────────────────────────────────
    const atmGeo = new THREE.SphereGeometry(config.radius * 1.12, 64, 64)
    this.atmMat = new THREE.ShaderMaterial({
      uniforms: {
        atmosphereColor:     { value: config.atmosphereColor },
        atmosphereIntensity: { value: (config.atmosphereIntensity ?? 0.8) * ATMOSPHERE_SCALE },
        emissiveBoost:       { value: 0.0 },
      },
      vertexShader:   atmosphereVert,
      fragmentShader: atmosphereFrag,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
      side:           THREE.FrontSide,
    })
    this.atmosphereMesh = new THREE.Mesh(atmGeo, this.atmMat)
    this.planetGroup.add(this.atmosphereMesh)

    // ── Ring (SYNTHEX only) ────────────────────────────────────────────────────
    if (config.hasRing) {
      const ringGeo = new THREE.RingGeometry(config.radius * 1.4, config.radius * 2.2, 128)
      // RingGeometry UVs are 0..1 across the quad; remap so the texture/gradient
      // runs radially (inner edge = 0, outer edge = 1) instead of across the strip.
      const pos = ringGeo.attributes.position
      const uv  = ringGeo.attributes.uv
      const v3  = new THREE.Vector3()
      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i)
        uv.setXY(i, v3.length() < config.radius * 1.8 ? 0 : 1, 1)
      }
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x9B59B6, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, depthWrite: false,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      this.planetGroup.add(ring)
    }

    // ── CSS2D label ─────────────────────────────────────────────────────────
    // Exposed as labelEl so main.js can make it clickable (autopilot target).
    const div = document.createElement('div')
    div.className = 'planet-label'
    div.textContent = config.name
    div.style.color = config.labelColor
    this.labelEl = div
    const label = new CSS2DObject(div)
    label.position.set(0, config.radius + 4, 0)
    this.planetGroup.add(label)

    // ── Moons ───────────────────────────────────────────────────────────────
    // Added to planetGroup (not orbitGroup) so each moon inherits the planet's
    // orbit around HELIOS and its axial tilt — they orbit in the planet's
    // equatorial plane. Start LOCKED; ScanSystem (Phase 9) unlocks them.
    for (const moonConfig of config.moons ?? []) {
      // parentKey lets the InfoPanel find this moon's content under its parent
      // planet's section in bodies.js.
      const moon = new Moon({ ...moonConfig, parentKey: config.bodyKey })
      this.planetGroup.add(moon.group)
      this.moons.push(moon)
    }
  }

  // Called every frame with deltaMs (milliseconds) to match spec orbit speeds
  update(deltaMs) {
    this.mesh.rotation.y += this.config.rotationSpeed * deltaMs
    for (const moon of this.moons) moon.update(deltaMs)
  }

  // World-space position of this planet (used by ProximitySystem)
  worldPosition() {
    const pos = new THREE.Vector3()
    this.planetGroup.getWorldPosition(pos)
    return pos
  }

  // Called by ProximitySystem when ship enters scan range
  onProximityEnter() {
    gsap.to(this.atmMat.uniforms.emissiveBoost, { value: 0.15, duration: 0.5 })
  }

  // Called by ProximitySystem when ship leaves scan range
  onProximityExit() {
    gsap.to(this.atmMat.uniforms.emissiveBoost, { value: 0.0, duration: 0.5 })
  }
}
