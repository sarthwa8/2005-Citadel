import * as THREE from 'three'

// 3 size/opacity groups totalling 5000 stars
const GROUPS = [
  { count: 200,  size: 3.5, color: 0xffffff, opacity: 1.0  }, // large, brilliant
  { count: 1300, size: 1.8, color: 0xd4eaff, opacity: 0.75 }, // medium, blue-white
  { count: 3500, size: 0.7, color: 0x8aaac8, opacity: 0.45 }, // small, dim
]

const MIN_RADIUS = 350   // keep stars clear of the inner system
const MAX_RADIUS = 2500  // sky-sphere outer bound

export class Starfield {
  constructor() {
    this.group = new THREE.Group()

    for (const g of GROUPS) {
      const positions = new Float32Array(g.count * 3)
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
        placed++
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      const mat = new THREE.PointsMaterial({
        color: g.color,
        size: g.size,
        sizeAttenuation: true,
        transparent: true,
        opacity: g.opacity,
        depthWrite: false,
      })

      this.group.add(new THREE.Points(geo, mat))
    }
  }
}
