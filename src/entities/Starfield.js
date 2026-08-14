import * as THREE from 'three'

// 3 size/opacity groups totalling 5000 stars. Each star is tinted with a stellar
// colour via a per-vertex colour attribute (blue/white/gold/orange/red giants,
// plus a few vivid "beacon" tints) — colour across the whole sky at zero extra
// draw cost. The brighter the group, the more colour it carries.
//
// Sizes are deliberately bumped off the sub-pixel floor: with sizeAttenuation the
// far stars in each group shrink with distance, and anything under ~1px on screen
// STROBES as the camera moves (its coverage flips on/off across pixel boundaries).
// Paired with the soft radial sprite below, these sizes keep even the far/dim
// stars as a smoothly-fading dot instead of a hard flashing pixel.
// Two size regimes (per-group `attenuate` flag):
//  • attenuate:false → size is in SCREEN PIXELS, fixed regardless of distance. Used
//    for the dense medium/small field so every star stays visible (never shrinks to
//    the sub-pixel size that strobes) — this is what makes the sky read as full.
//  • attenuate:true  → size is in WORLD UNITS and scales with distance, so these
//    "hero" stars grow as you zoom/fly toward them (a real depth cue). Kept to the
//    big bright group only, and sized so even the farthest stays ≳2px (no strobe).
const GROUPS = [
  { count: 340,  size: 6.0, opacity: 1.0,  vivid: 0.55, attenuate: true  }, // hero — depth-scaled
  { count: 1950, size: 2.6, opacity: 0.95, vivid: 0.30, attenuate: false }, // medium
  { count: 5250, size: 1.7, opacity: 0.82, vivid: 0.16, attenuate: false }, // small — dusty field
]

// Soft circular star sprite (shared by all groups). A radial gradient with a bright
// core fading to zero alpha gives every point an anti-aliased edge, so a star
// crossing a pixel boundary fades in/out gently instead of popping — the fix for
// the "stars flashing when I move" twinkle. Mipmaps (on by default for CanvasTexture)
// further smooth the sprite when it's minified to a couple of pixels far away.
function makeStarSprite() {
  const s = 64
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  const ctx = cv.getContext('2d')
  // Bright, TIGHT core (reads as a crisp star / blooms nicely) + a thin feathered
  // ring (the only part that needs to be soft to stop the sub-pixel strobe). A broad
  // even glow would look punchy-less and washed — the punch lives in the core.
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0.0, 'rgba(255,255,255,1)')
  g.addColorStop(0.16, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.40, 'rgba(255,255,255,0.32)')
  g.addColorStop(0.70, 'rgba(255,255,255,0.07)')
  g.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
const STAR_SPRITE = makeStarSprite()

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
        sizeAttenuation: g.attenuate, // hero group scales with distance; rest fixed-size
        vertexColors: true,
        transparent: true,
        opacity: g.opacity,
        depthWrite: false,
        map: STAR_SPRITE,       // soft edge → no per-pixel strobe on movement
        alphaTest: 0.01,        // drop the fully-transparent corners of the sprite quad
      })

      this.group.add(new THREE.Points(geo, mat))
    }
  }
}
