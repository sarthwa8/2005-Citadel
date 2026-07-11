import * as THREE from 'three'
import { gsap } from 'gsap'
import { state } from '../state.js'
import { renderer } from './scene.js'

export let camera

// ── Tuning ───────────────────────────────────────────────────────────────────

// MAP camera (default, ENTER) — Mass Effect galaxy-map style: a LOW cinematic
// isometric angle that looks across the orbital plane and FOLLOWS the ship as it
// flies. Drag rotates the view; wheel zooms.
const MAP_PITCH        = 0.55   // rad above the orbital plane (~31°): low + cinematic
const MAP_DIST_DEFAULT = 260    // zoomed out enough to read the surrounding system
const MAP_DIST_MIN     = 110
const MAP_DIST_MAX     = 640
const MAP_ROT_SPEED    = 0.005  // rad of rotation per px of horizontal drag
const MAP_ZOOM_SPEED   = 0.5    // mapDist change per wheel deltaY unit

// DRIVE camera (Tab) — the close behind-the-ship chase cam (the original cockpit-ish
// driving view). Offset is rotated by the ship's quaternion so W is always forward.
const CHASE_OFFSET = new THREE.Vector3(0, 9, 34)

const TRANSITION_SECS = 1.35
const BASE_FOV  = 60
const TURBO_FOV = 82

// Per-frame smoothing — λ per second, fed through dampAlpha() so the feel is
// identical at 60Hz and 120Hz and frame hitches can't make the camera pop.
// Higher = snappier, lower = floatier.
const POS_DAMP_MAP   = 5.5   // map cam position follow
const POS_DAMP_DRIVE = 5.0   // chase cam position follow
const POS_DAMP_SCAN  = 3.5   // scan orbit drift
const LOOK_DAMP      = 6.5   // look-target follow
const ROT_DAMP       = 9.0   // drag-rotate glide toward the pointer
const ZOOM_DAMP      = 6.5   // wheel-zoom glide toward the target distance
const FOV_DAMP       = 5.0   // turbo/base FOV ease

// Scan mode: camera parks at radius*2.5 from the body, elevated, drifting slowly.
const SCAN_DIST_FACTOR   = 2.5
const SCAN_MIN_DIST      = 14
const SCAN_HEIGHT_FACTOR = 0.6
const SCAN_ORBIT_SPEED   = 0.00012   // rad/ms

const UP = new THREE.Vector3(0, 1, 0)

// ── State ────────────────────────────────────────────────────────────────────

// Map camera: user-controlled rotation (drag) + zoom (wheel). Input writes the
// *Target values; the per-frame controller damps the live values toward them so
// wheel ticks and pointer moves glide instead of stepping.
let mapAzimuth = 0
let mapAzimuthTarget = 0
let mapDist = MAP_DIST_DEFAULT
let mapDistTarget = MAP_DIST_DEFAULT
let dragging = false
let lastPointerX = 0

// Body the scan camera is orbiting + its accumulated drift angle.
let scanRef = null
let scanAngle = 0

// Where the camera is looking. Tweened by GSAP during transitions.
const _lookTarget  = new THREE.Vector3()
const _desiredPos  = new THREE.Vector3()
const _offsetWorld = new THREE.Vector3()
const _fwd         = new THREE.Vector3()
const _dirAway     = new THREE.Vector3()
const _wp          = new THREE.Vector3()
const _isoDir      = new THREE.Vector3()

// One-pole smoothing alpha for this frame: 1 − e^(−λ·dt). Frame-rate-independent
// replacement for a fixed per-frame lerp factor.
function dampAlpha(lambda, deltaMs) {
  return 1 - Math.exp(-lambda * deltaMs / 1000)
}

// Unit iso direction (from the followed point toward the camera). Not tied to the
// ship's heading — mapAzimuth is user-controlled (drag).
function mapUnitDir(out) {
  const cp = Math.cos(MAP_PITCH)
  return out.set(Math.sin(mapAzimuth) * cp, Math.sin(MAP_PITCH), Math.cos(mapAzimuth) * cp)
}

// World-locked iso offset (unit dir × mapDist) from the followed point to the map camera.
function mapCamOffset() {
  return mapUnitDir(_isoDir).multiplyScalar(mapDist)
}

// Point the camera follows (ship if it exists, else the system start point).
function followPoint(ship) {
  return ship?.group ? ship.group.position : _wp.set(0, 0, 70)
}

// ── Init ─────────────────────────────────────────────────────────────────────

export function initCamera() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  )

  // Boot straight into the map view — there's no separate top-down overview.
  state.cameraMode = 'flight'
  state.flightCam = 'map'
  _lookTarget.set(0, 0, 70)
  camera.position.copy(_lookTarget).add(mapCamOffset())
  camera.lookAt(_lookTarget)

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  })

  // Drag-to-rotate + wheel-to-zoom — only in the map view (drive cam auto-follows).
  const el = renderer.domElement
  el.addEventListener('pointerdown', e => {
    if (state.transitioning || state.cameraMode !== 'flight' || state.flightCam !== 'map') return
    dragging = true
    lastPointerX = e.clientX
  })
  window.addEventListener('pointermove', e => {
    if (!dragging) return
    mapAzimuthTarget -= (e.clientX - lastPointerX) * MAP_ROT_SPEED
    lastPointerX = e.clientX
  })
  window.addEventListener('pointerup', () => { dragging = false })

  el.addEventListener('wheel', e => {
    if (state.cameraMode !== 'flight' || state.flightCam !== 'map') return
    e.preventDefault()
    mapDistTarget = THREE.MathUtils.clamp(mapDistTarget + e.deltaY * MAP_ZOOM_SPEED, MAP_DIST_MIN, MAP_DIST_MAX)
  }, { passive: false })

  return camera
}

// ── Mode transitions (GSAP) ──────────────────────────────────────────────────

// Tween the camera into a new mode/framing. 'flight' frames per state.flightCam
// (map | drive); 'scan' orbits the scanned body. The per-frame controller takes
// over when the tween lands.
export function transitionTo(newMode, targetBody = null) {
  gsap.killTweensOf(camera.position)
  gsap.killTweensOf(_lookTarget)
  state.transitioning = true
  state.cameraMode = newMode
  dragging = false

  const destPos = new THREE.Vector3()
  const destLook = new THREE.Vector3()

  if (newMode === 'flight') {
    scanRef = null
    flightDest(targetBody, destPos, destLook)
  } else if (newMode === 'scan') {
    scanRef = targetBody
    scanAngle = 0
    scanOrbitPosition(0, destPos)
    destLook.copy(_wp)   // scanOrbitPosition leaves the body's world pos in _wp
  }

  gsap.to(camera.position, {
    x: destPos.x, y: destPos.y, z: destPos.z,
    duration: TRANSITION_SECS, ease: 'power3.inOut',
    onComplete: () => { state.transitioning = false },
  })
  gsap.to(_lookTarget, {
    x: destLook.x, y: destLook.y, z: destLook.z,
    duration: TRANSITION_SECS, ease: 'power3.inOut',
  })
}

// Destination pose for flight, depending on the active sub-cam (map | drive).
function flightDest(ship, destPos, destLook) {
  if (state.flightCam === 'drive' && ship?.ready) {
    destPos.copy(CHASE_OFFSET).applyQuaternion(ship.group.quaternion).add(ship.group.position)
    _fwd.set(0, 0, 1).applyQuaternion(ship.group.quaternion)
    destLook.copy(ship.group.position).addScaledVector(_fwd, 6)
  } else {
    const p = followPoint(ship)
    destPos.copy(p).add(mapCamOffset())
    destLook.copy(p)
  }
}

// Reset to the default MAP framing (bound to R in main.js). Recentres rotation +
// zoom and tweens back from wherever (drive / scan / rotated map).
export function resetView(ship = null) {
  mapAzimuth = mapAzimuthTarget = 0
  mapDist = mapDistTarget = MAP_DIST_DEFAULT
  state.flightCam = 'map'
  transitionTo('flight', ship)
}

// ── Cinematic warp-in intro ──────────────────────────────────────────────────
export const INTRO_DURATION = 5.2

// The ease IS the warp's personality — it shapes the whole fly-in. 'power3.inOut':
// gentle launch out of the landing veil, fast mid-flight, long glide into the map
// pose (velocity hits zero exactly at handover, so the follow cam takes over with
// no pop). Alternatives worth trying: 'expo.out' = hard slam-in with an extra-long
// settle; 'power2.inOut' = the old, shorter-tailed feel.
const WARP_EASE = 'power3.inOut'

// Jump the camera far out into deep space, locked, looking at the system. Called on
// ENTER (hidden behind the loading screen) so flyIntro() can warp in from here.
export function beginIntro(ship) {
  gsap.killTweensOf(camera.position)
  gsap.killTweensOf(camera)
  const dir = mapUnitDir(new THREE.Vector3())
  _lookTarget.copy(ship.group.position)
  camera.position.copy(ship.group.position).addScaledVector(dir, 1700)
  camera.fov = 96
  camera.updateProjectionMatrix()
  state.cameraMode = 'flight'
  state.transitioning = true
}

// Warp in: fly from the deep-space pose to the normal map pose, FOV easing back.
// Releases control (transitioning=false) and calls onDone when it lands.
export function flyIntro(ship, onDone) {
  const dir = mapUnitDir(new THREE.Vector3())
  const land = new THREE.Vector3().copy(ship.group.position).addScaledVector(dir, mapDist)
  gsap.to(camera.position, {
    x: land.x, y: land.y, z: land.z,
    duration: INTRO_DURATION, ease: WARP_EASE,
    onComplete: () => { state.transitioning = false; onDone?.() },
  })
  // FOV rides the same curve as position so the stretch and the motion settle in
  // lockstep — mismatched eases read as a subtle "double landing".
  gsap.to(camera, {
    fov: BASE_FOV, duration: INTRO_DURATION, ease: WARP_EASE,
    onUpdate: () => camera.updateProjectionMatrix(),
  })
}

// ── Per-frame controller ─────────────────────────────────────────────────────

export function updateCamera(ship, deltaMs = 16.7) {
  if (!camera) return

  // During a transition GSAP owns position and _lookTarget — just aim.
  if (state.transitioning) {
    camera.lookAt(_lookTarget)
    return
  }

  if (state.cameraMode === 'scan') {
    if (!scanRef) return
    scanAngle += SCAN_ORBIT_SPEED * deltaMs
    scanOrbitPosition(scanAngle, _desiredPos)
    camera.position.lerp(_desiredPos, dampAlpha(POS_DAMP_SCAN, deltaMs))
    _lookTarget.copy(_wp)
    camera.lookAt(_lookTarget)

  } else if (state.flightCam === 'drive') {
    // Close behind-the-ship chase cam.
    if (!ship?.ready) return
    _offsetWorld.copy(CHASE_OFFSET).applyQuaternion(ship.group.quaternion)
    _desiredPos.copy(ship.group.position).add(_offsetWorld)
    camera.position.lerp(_desiredPos, dampAlpha(POS_DAMP_DRIVE, deltaMs))
    _fwd.set(0, 0, 1).applyQuaternion(ship.group.quaternion)
    _lookTarget.copy(ship.group.position).addScaledVector(_fwd, 6)
    camera.lookAt(_lookTarget)

  } else {
    // MAP: low cinematic iso angle following the ship's position (user rotates via
    // drag, zooms via wheel). Rotation + zoom glide toward their input targets.
    mapAzimuth += (mapAzimuthTarget - mapAzimuth) * dampAlpha(ROT_DAMP, deltaMs)
    mapDist    += (mapDistTarget    - mapDist)    * dampAlpha(ZOOM_DAMP, deltaMs)
    const p = followPoint(ship)
    _desiredPos.copy(p).add(mapCamOffset())
    camera.position.lerp(_desiredPos, dampAlpha(POS_DAMP_MAP, deltaMs))
    _lookTarget.lerp(p, dampAlpha(LOOK_DAMP, deltaMs))
    camera.lookAt(_lookTarget)
  }

  // Belt turbulence — jitter applied after lookAt so it survives the frame.
  if (state.cameraMode === 'flight' && state.inAsteroidBelt) {
    const shake = (Math.random() - 0.5) * 0.08
    camera.position.x += shake
    camera.position.y += shake * 0.5
  }

  // Speed-rush FOV: widen during turbo or autopilot cruise, ease back otherwise.
  const boosting = state.cameraMode === 'flight' && (state.turbo || state.autopilotActive)
  const targetFov = boosting ? TURBO_FOV : BASE_FOV
  if (Math.abs(camera.fov - targetFov) > 0.04) {
    camera.fov += (targetFov - camera.fov) * dampAlpha(FOV_DAMP, deltaMs)
    camera.updateProjectionMatrix()
  }
}

// Camera position on the scan orbit at the given drift angle. Base direction is
// "away from HELIOS" so the body gets a backlit silhouette with a glowing rim.
// Side effect: leaves the body's world position in _wp for the caller.
function scanOrbitPosition(angle, out) {
  scanRef.worldPosition
    ? _wp.copy(scanRef.worldPosition())
    : scanRef.group.getWorldPosition(_wp)

  _dirAway.set(_wp.x, 0, _wp.z)
  if (_dirAway.lengthSq() < 1e-6) _dirAway.set(1, 0, 0)
  _dirAway.normalize().applyAxisAngle(UP, angle)

  const dist = Math.max((scanRef.config?.radius ?? 5) * SCAN_DIST_FACTOR, SCAN_MIN_DIST)
  out.copy(_wp)
    .addScaledVector(_dirAway, dist)
    .addScaledVector(UP, dist * SCAN_HEIGHT_FACTOR)
  return out
}
