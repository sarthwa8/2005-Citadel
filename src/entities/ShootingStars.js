import * as THREE from 'three'

// Occasional shooting stars — fast colour-tinted meteor streaks that cross the far
// sky and fade. A small pool of reusable Points trails; one spawns every few
// seconds. Visual only (no scan/collision). Cheap: at most a handful of short
// trails updated per frame.

const POOL        = 4
const TRAIL       = 18
const MIN_GAP_MS  = 2600
const MAX_GAP_MS  = 6500
const COLORS      = [0xffffff, 0x9fe8ff, 0xffd24a, 0x69ffc6, 0xff7bd0, 0xb98cff]

const _head  = new THREE.Vector3()
const _from  = new THREE.Vector3()
const _cross = new THREE.Vector3()

export class ShootingStars {
  constructor() {
    this.group = new THREE.Group()
    this.meteors = []
    this.timer = 0
    this.nextMs = 1800

    for (let i = 0; i < POOL; i++) {
      const pos = new Float32Array(TRAIL * 3)
      const col = new Float32Array(TRAIL * 3)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
      geo.setDrawRange(0, 0)
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        size: 2.6, vertexColors: true, sizeAttenuation: true,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }))
      pts.frustumCulled = false
      pts.visible = false
      this.group.add(pts)
      this.meteors.push({ pts, pos, col, active: false, t: 0, dur: 0, speed: 0,
                          dir: new THREE.Vector3(), color: new THREE.Color() })
    }
  }

  // deltaMs — real time (these are quick one-shot events, like the comet).
  update(deltaMs) {
    this.timer += deltaMs
    if (this.timer >= this.nextMs) {
      this.timer = 0
      this.nextMs = MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS)
      this._spawn()
    }
    for (const m of this.meteors) if (m.active) this._step(m, deltaMs)
  }

  _spawn() {
    const m = this.meteors.find(x => !x.active)
    if (!m) return

    // Start somewhere on a far shell, fly roughly tangentially across the sky.
    const r = 520 + Math.random() * 380
    _from.randomDirection().multiplyScalar(r)
    _cross.randomDirection()
    m.dir.copy(_cross).addScaledVector(_from, -_cross.dot(_from) / (r * r)).normalize()
    m.speed = 280 + Math.random() * 240   // u/s
    m.dur   = 850 + Math.random() * 750   // ms
    m.color.set(COLORS[(Math.random() * COLORS.length) | 0])
    m.t = 0
    m.active = true
    m.pts.visible = true
    for (let i = 0; i < TRAIL; i++) m.pos.set([_from.x, _from.y, _from.z], i * 3)
  }

  _step(m, deltaMs) {
    m.t += deltaMs
    const dt = deltaMs / 1000

    _head.set(m.pos[0], m.pos[1], m.pos[2]).addScaledVector(m.dir, m.speed * dt)
    m.pos.copyWithin(3, 0, (TRAIL - 1) * 3)   // shift breadcrumbs back one slot
    m.pos[0] = _head.x; m.pos[1] = _head.y; m.pos[2] = _head.z

    const life = Math.max(0, 1 - m.t / m.dur)
    const c = m.color
    for (let i = 0; i < TRAIL; i++) {
      const k = (1 - i / (TRAIL - 1)) * life   // bright head → faded tail, dimming over life
      m.col[i * 3]     = c.r * k
      m.col[i * 3 + 1] = c.g * k
      m.col[i * 3 + 2] = c.b * k
    }
    m.pts.geometry.setDrawRange(0, TRAIL)
    m.pts.geometry.attributes.position.needsUpdate = true
    m.pts.geometry.attributes.color.needsUpdate = true

    if (m.t >= m.dur) { m.active = false; m.pts.visible = false }
  }
}
