import * as THREE from 'three'

// A few distant spiral galaxies — tilted, additively-blended discs far out near
// the sky edge, each a different colour, spinning very slowly. Drawn as procedural
// canvas textures on plane meshes (not camera-facing sprites) so they read as
// tilted discs, not flat circles. Cheap: 3 quads + 3 small textures.

// Draw a spiral galaxy into a canvas: bright core + 2 trailing arms + faint haze.
function makeGalaxyTexture(hex) {
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255
  ctx.translate(s / 2, s / 2)

  // Faint disc haze
  const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.48)
  haze.addColorStop(0, `rgba(${r},${g},${b},0.16)`)
  haze.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = haze
  ctx.beginPath(); ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2); ctx.fill()

  // Spiral arms — speckled dots along two logarithmic arms
  for (let a = 0; a < 2; a++) {
    for (let t = 0.02; t < 1; t += 0.0045) {
      const ang = a * Math.PI + t * Math.PI * 3.1
      const rad = t * s * 0.46
      const x = Math.cos(ang) * rad + (Math.random() - 0.5) * 7
      const y = Math.sin(ang) * rad + (Math.random() - 0.5) * 7
      ctx.fillStyle = `rgba(${r},${g},${b},${(1 - t) * 0.5})`
      ctx.beginPath(); ctx.arc(x, y, (1 - t) * 2.2 + 0.4, 0, Math.PI * 2); ctx.fill()
    }
  }

  // Bright core
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.18)
  core.addColorStop(0, 'rgba(255,255,255,0.95)')
  core.addColorStop(0.4, `rgba(${r},${g},${b},0.65)`)
  core.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = core
  ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2); ctx.fill()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const GALAXIES = [
  { hex: 0x8FB6FF, pos: [-1700,  760, -1500], size: 760, tilt: [0.9,  0.3,  0.4], spin:  0.012 }, // blue
  { hex: 0xFFC98A, pos: [ 1850, -560, -1250], size: 580, tilt: [-0.6, 1.1,  0.2], spin: -0.009 }, // gold
  { hex: 0xE58CFF, pos: [-1250, -820,  1750], size: 680, tilt: [0.4, -0.8,  1.0], spin:  0.015 }, // violet-pink
]

export class Galaxy {
  constructor() {
    this.group = new THREE.Group()
    this.discs = []

    for (const d of GALAXIES) {
      const mat = new THREE.MeshBasicMaterial({
        map: makeGalaxyTexture(d.hex),
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        depthTest: true,            // planets occlude galaxies behind them
        blending: THREE.AdditiveBlending,
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.size, d.size), mat)
      mesh.position.set(...d.pos)
      mesh.rotation.set(...d.tilt)
      this.discs.push({ mesh, spin: d.spin })
      this.group.add(mesh)
    }
  }

  // delta in seconds — slow rotation about each disc's own normal (local Z).
  update(delta) {
    for (const d of this.discs) d.mesh.rotateZ(d.spin * delta)
  }
}
