import * as THREE from 'three'

// 3 size/opacity groups totalling 5000 stars. Each star is tinted with a stellar
// colour via a per-vertex colour attribute (blue/white/gold/orange/red giants,
// plus a few vivid "beacon" tints) — colour across the whole sky at zero extra
// draw cost. The brighter the group, the more colour it carries.
const GROUPS = [
  { count: 200,  size: 3.6, opacity: 1.0,  vivid: 0.55 }, // large, brilliant
  { count: 1300, size: 1.8, opacity: 0.78, vivid: 0.30 }, // medium
  { count: 3500, size: 0.7, opacity: 0.46, vivid: 0.16 }, // small, dim
]

// Common-ish stellar tints (weighted toward white/blue-white via repeats).
const STAR_TINTS = [
  0xffffff, 0xffffff, 0xdfeaff, 0xcdddff,   // white / blue-white
  0xfff2cf, 0xffd9a0, 0xffb27a,             // yellow / gold / orange
  0xff8f6b, 0xff6b6b,                        // orange-red / red
]
// Punchy beacons so a few stars really pop with colour.
const VIVID_TINTS = [
  0x6aa0ff, 0x66f0ff, 0x69ffc6, 0xff7bd0, 0xb98cff, 0xffd24a,
]

const MIN_RADIUS = 350   // keep stars clear of the inner system
const MAX_RADIUS = 2500  // sky-sphere outer bound

export class Starfield {
  constructor() {
    this.group = new THREE.Group()
    const tmp = new THREE.Color()

    for (const g of GROUPS) {
      const positions = new Float32Array(g.count * 3)
      const colors    = new Float32Array(g.count * 3)
      let placed = 0

      while (placed < g.count) {
        const x = (Math.random() - 0.5) * MAX_RADIUS * 2
        const y = (Math.random() - 0.5) * MAX_RADIUS * 2
        const z = (Math.random() - 0.5) * MAX_RADIUS * 2
        const r = Math.sqrt(x * x + y * y + z * z)
        if (r < MIN_RADIUS || r > MAX_RADIUS) continue

        positions[placed * 3]     = x
        positions[placed * 3 + 1] = y
        positions[placed * 3 + 2] = z

        const palette = Math.random() < g.vivid ? VIVID_TINTS : STAR_TINTS
        tmp.set(palette[(Math.random() * palette.length) | 0])
        colors[placed * 3]     = tmp.r
        colors[placed * 3 + 1] = tmp.g
        colors[placed * 3 + 2] = tmp.b
        placed++
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

      const mat = new THREE.PointsMaterial({
        size: g.size,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: g.opacity,
        depthWrite: false,
      })

      this.group.add(new THREE.Points(geo, mat))
    }
  }
}
