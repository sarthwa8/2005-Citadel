import * as THREE from 'three'
import { gsap } from 'gsap'
import { state } from '../state.js'
import * as InputSystem from './InputSystem.js'

// Click a body in overview → the ship flies itself there. GSAP tweens an eased
// progress scalar; the actual path is recomputed every frame between the launch
// point and the body's LIVE position (planets move a long way during a flight —
// a fixed-destination tween would arrive at empty space). Arrival parks just
// inside the body's scanRadius so "[E] SCAN" is immediately available.
//
// After arrival the autopilot STATION-KEEPS: outer planets orbit at ~25 u/s
// (≈ the ship's top speed), so a parked ship would watch its target sail away
// in seconds. Holding the arrival offset relative to the moving body keeps
// "[E] SCAN" available until the pilot acts.
//
// Cancels itself when: any thrust key is pressed (manual override), or the
// camera leaves flight mode (Tab to overview, scan opening).

const CRUISE_SPEED  = 100   // units/s — sets tween duration from distance
const MIN_DURATION  = 2.5
const MAX_DURATION  = 8
const PARK_FACTOR   = 0.7   // arrive at scanRadius * this from the body center
const TAKEOFF_DELAY = 1.15  // let the overview→flight camera transition land first

let ship = null
let tween = null
let phase = 'idle'   // 'idle' | 'cruise' | 'hold'
const progress = { t: 0 }
const startPos = new THREE.Vector3()
const holdOffset = new THREE.Vector3()   // ship − body at arrival, held during 'hold'
let parkDist = 25

const _bodyWP  = new THREE.Vector3()
const _dir     = new THREE.Vector3()
const _dest    = new THREE.Vector3()
const _desired = new THREE.Vector3()

export function init(deps) {
  ship = deps.ship
}

export function flyTo(body) {
  if (!ship?.ready) return
  cancel()

  state.autopilotActive = true
  state.autopilotTarget = body
  startPos.copy(ship.group.position)
  parkDist = (body.config.scanRadius ?? 35) * PARK_FACTOR

  // Pre-align the nose toward the destination during the takeoff delay so the ship
  // launches facing the right way instead of swinging around after it starts moving.
  ship.faceTowards(body.worldPosition(), 1)

  const dist = startPos.distanceTo(body.worldPosition())
  const cruiseDur = THREE.MathUtils.clamp(dist / CRUISE_SPEED, MIN_DURATION, MAX_DURATION)
  progress.t = 0
  phase = 'cruise'
  tween = gsap.to(progress, {
    t: 1,
    duration: cruiseDur,
    delay: TAKEOFF_DELAY,
    ease: 'power2.inOut',
    onComplete: () => {
      tween = null
      // Land exactly at the park point before switching phases: GSAP fires this
      // inside its own tick, before the game loop's next AutopilotSystem.update,
      // so without this the last step of motion (t→1) would be dropped.
      applyCruise(1 / 60)
      // Switch to station-keeping: remember where we sit relative to the body
      // and ride along with its orbit until the pilot takes over.
      holdOffset.copy(ship.group.position).sub(state.autopilotTarget.worldPosition())
      phase = 'hold'
    },
  })
}

export function cancel() {
  if (tween) { tween.kill(); tween = null }
  phase = 'idle'
  state.autopilotActive = false
  state.autopilotTarget = null
}

export function update(delta) {
  if (!state.autopilotActive || !state.autopilotTarget) return
  if (state.cameraMode !== 'flight') { cancel(); return }
  if (InputSystem.getRawThrust().lengthSq() > 0) { cancel(); return }   // pilot takes over
  if (delta <= 0) return

  if (phase === 'cruise') applyCruise(delta)
  else if (phase === 'hold') applyHold(delta)
}

// Station-keeping: ride along with the body's orbit, holding the arrival offset.
function applyHold(delta) {
  _bodyWP.copy(state.autopilotTarget.worldPosition())
  _desired.copy(_bodyWP).add(holdOffset)
  state.shipVelocity.subVectors(_desired, ship.group.position).divideScalar(delta)
  ship.group.position.copy(_desired)
  state.shipPosition.copy(_desired)
  ship.faceTowards(_bodyWP, 0.08)   // keep the nose on the body it's orbiting
}

// Place the ship on the path at the current eased progress. Destination tracks
// the live body: approach along the start→body line, stopping parkDist short
// of the center.
function applyCruise(delta) {
  _bodyWP.copy(state.autopilotTarget.worldPosition())
  _dir.subVectors(_bodyWP, startPos)
  if (_dir.lengthSq() < 1e-6) return
  _dir.normalize()
  _dest.copy(_bodyWP).addScaledVector(_dir, -parkDist)

  _desired.lerpVectors(startPos, _dest, progress.t)

  // Velocity = actual motion this frame — hands realistic momentum to manual control
  // if the pilot cancels mid-flight.
  state.shipVelocity.subVectors(_desired, ship.group.position).divideScalar(delta)
  ship.group.position.copy(_desired)
  state.shipPosition.copy(_desired)
  ship.faceTowards(_bodyWP, 0.2)   // nose stays locked on the destination — flies forward
}
