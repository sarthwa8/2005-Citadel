import { state } from '../state.js'

// Tracks which scannable body is nearest to the ship each frame and whether it's
// within scan range. All cross-system communication goes through state — the
// ScanSystem and HUD read state.nearestBody / state.inScanRange from here.
//
// Scannable set = the 5 planets + UNLOCKED moons + the NOVARA station + the
// comet while it's crossing. Locked moons are excluded so the scan loop can't
// target a ghosted moon before its parent planet is scanned. (Gold asteroids
// join later.)

let planets = []
let station = null
let comet = null

// The body currently glowing from proximity (atmosphere emissive boost).
let activeBody = null

export function init(planetList, stationRef = null, cometRef = null) {
  planets = planetList
  station = stationRef
  comet = cometRef
}

export function update() {
  if (state.cameraMode !== 'flight' && state.cameraMode !== 'scan') {
    // Overview mode: no proximity tracking; clear any lingering glow.
    if (activeBody) { activeBody.onProximityExit?.(); activeBody = null }
    state.nearestBody = null
    state.nearestBodyDistance = Infinity
    state.inScanRange = false
    state.inAsteroidBelt = false
    return
  }

  let nearest = null
  let nearestDist = Infinity

  for (const planet of planets) {
    const d = state.shipPosition.distanceTo(planet.worldPosition())
    if (d < nearestDist) { nearest = planet; nearestDist = d }

    for (const moon of planet.moons) {
      if (moon.locked) continue
      const md = state.shipPosition.distanceTo(moon.worldPosition())
      if (md < nearestDist) { nearest = moon; nearestDist = md }
    }
  }

  if (station?.ready) {
    const sd = state.shipPosition.distanceTo(station.worldPosition())
    if (sd < nearestDist) { nearest = station; nearestDist = sd }
  }

  if (comet && state.cometVisible) {
    const cd = state.shipPosition.distanceTo(comet.worldPosition())
    if (cd < nearestDist) { nearest = comet; nearestDist = cd }
  }

  // Belt turbulence flag — ship inside the asteroid torus (ring 192–208, near
  // the belt plane). camera.js reads this and jitters the chase camera.
  const radial = Math.hypot(state.shipPosition.x, state.shipPosition.z)
  state.inAsteroidBelt =
    radial > 192 && radial < 208 && Math.abs(state.shipPosition.y) < 12

  state.nearestBody = nearest
  state.nearestBodyDistance = nearestDist
  state.inScanRange = nearestDist < (nearest?.config.scanRadius ?? 35)

  // Proximity glow: enter on the in-range body, exit when it changes or goes out of range.
  const next = state.inScanRange ? nearest : null
  if (next !== activeBody) {
    activeBody?.onProximityExit?.()
    next?.onProximityEnter?.()
    activeBody = next
  }
}
