import * as THREE from 'three'
import { gsap } from 'gsap'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { Moon } from './Moon.js'
import { makeGlowSprite } from '../core/glow.js'
import { BODIES } from '../data/bodies.js'

const textureLoader = new THREE.TextureLoader()

// Peak opacity of a planet's soft glow halo, scaled by its atmosphereIntensity.
const HALO_OPACITY = 0.55
const HALO_SIZE    = 3.2   // halo sprite size = planet radius × this

// 1-D ring texture: a tinted strip that fades to transparent at both edges with
// faint banding, mapped radially across the ring disc (inner edge → outer edge).
function makeRingTexture(color) {
  const w = 512, h = 4
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  const col = new THREE.Color(color)
  const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255)
  const img = ctx.createImageData(w, h)
  for (let x = 0; x < w; x++) {
    const u = x / (w - 1)
    let a = Math.pow(Math.sin(Math.PI * u), 0.8)                      // soft fade at both edges
    a *= 0.72 + 0.28 * Math.sin(u * 58.0) * Math.sin(u * 21.0)        // subtle bands
    a = Math.max(0, Math.min(1, a)) * 0.9
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b
      img.data[i + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

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

    // ── Atmospheric glow — soft camera-facing halo that diffuses into space ──
    // Replaces the old fresnel rim shader, which read as a hard ring at the limb.
    this._haloBase = (config.atmosphereIntensity ?? 0.8) * HALO_OPACITY
    this.halo = makeGlowSprite(config.atmosphereColor, config.radius * HALO_SIZE, this._haloBase)
    this.planetGroup.add(this.halo)

    // ── Ring (SYNTHEX only) — banded disc that fades softly at both edges ──────
    if (config.hasRing) {
      const innerR = config.radius * 1.4
      const outerR = config.radius * 2.4
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 160, 1)
      // Remap UV.x to the true radial position (0 = inner edge → 1 = outer edge)
      // so a 1-D ring texture lays bands + edge fades across the disc.
      const pos = ringGeo.attributes.position
      const uv  = ringGeo.attributes.uv
      const v3  = new THREE.Vector3()
      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i)
        uv.setXY(i, (v3.length() - innerR) / (outerR - innerR), 0.5)
      }
      const ringMat = new THREE.MeshBasicMaterial({
        map: makeRingTexture(config.ringColor ?? 0xB089D6),
        transparent: true, opacity: 0.85,
        side: THREE.DoubleSide, depthWrite: false,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2.05   // slight tilt so it isn't perfectly edge-on
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
      // planet's section in bodies.js. The floating 3D tag also reads its label
      // straight from bodies.js (falling back to the config label) so all moon
      // text lives in one file.
      const content = BODIES[config.bodyKey]?.moons?.find(m => m.name === moonConfig.name)
      const moon = new Moon({ ...moonConfig, label: content?.label ?? moonConfig.label, parentKey: config.bodyKey })
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

  // Called by ProximitySystem when ship enters scan range — brighten the halo
  onProximityEnter() {
    gsap.to(this.halo.material, { opacity: this._haloBase * 1.9, duration: 0.5 })
  }

  // Called by ProximitySystem when ship leaves scan range
  onProximityExit() {
    gsap.to(this.halo.material, { opacity: this._haloBase, duration: 0.5 })
  }
}
