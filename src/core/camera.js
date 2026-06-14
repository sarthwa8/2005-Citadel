import * as THREE from 'three'
import { gsap } from 'gsap'
import { state } from '../state.js'
import { renderer } from './scene.js'

export let camera

// ── Tuning ───────────────────────────────────────────────────────────────────

// Ship-relative offset for the chase camera. The ship is normalized to ~16 units
// long (Ship.SHIP_LENGTH), so the camera sits ~2 ship-lengths back and a bit
// above to frame the whole hull with a slight top-down read of the wings.
const CHASE_OFFSET = new THREE.Vector3(0, 9, 34)

const OVERVIEW_POS    = new THREE.Vector3(0, 500, 200)
const OVERVIEW_RADIUS = OVERVIEW_POS.length()
const TRANSITION_SECS = 1.1

const BASE_FOV  = 60
const TURBO_FOV = 82

// Scan mode: camera parks at radius*2.5 from the body (floored so tiny moons
// don't put it inside the label), elevated, drifting slowly around it.
const SCAN_DIST_FACTOR   = 2.5
const SCAN_MIN_DIST      = 14
const SCAN_HEIGHT_FACTOR = 0.6
const SCAN_ORBIT_SPEED   = 0.00012   // rad/ms

const UP = new THREE.Vector3(0, 1, 0)

// ── State ────────────────────────────────────────────────────────────────────

// Overview drag-orbit (azimuth/elevation around the origin at fixed radius)
const HOME_ELEVATION = Math.asin(OVERVIEW_POS.y / OVERVIEW_RADIUS)
let azimuth = 0
let elevation = HOME_ELEVATION
let dragging = false
let lastPointerX = 0
let lastPointerY = 0

// Body the scan camera is orbiting + its accumulated drift angle
let scanRef = null
let scanAngle = 0

// Where the camera is looking. Updated continuously by every mode so GSAP can
// tween it during transitions without a visible snap.
const _lookTarget = new THREE.Vector3()

// Reusable temporaries
const _desiredPos  = new THREE.Vector3()
const _offsetWorld = new THREE.Vector3()
const _fwd         = new THREE.Vector3()
const _dirAway     = new THREE.Vector3()
const _wp          = new THREE.Vector3()

// ── Init ─────────────────────────────────────────────────────────────────────

export function initCamera() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  )

  setOverview()

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  })

  // Overview drag-to-orbit. Attached to the WebGL canvas (the CSS2D overlay has
  // pointer-events:none) so HUD buttons never start a drag.
  const el = renderer.domElement
  el.addEventListener('pointerdown', e => {
    if (state.cameraMode !== 'overview' || state.transitioning) return
    dragging = true
    lastPointerX = e.clientX
    lastPointerY = e.clientY
  })
  window.addEventListener('pointermove', e => {
    if (!dragging) return
    azimuth   -= (e.clientX - lastPointerX) * 0.005
    elevation += (e.clientY - lastPointerY) * 0.003
    elevation = THREE.MathUtils.clamp(elevation, 0.15, 1.45)
    lastPointerX = e.clientX
    lastPointerY = e.clientY
  })
  window.addEventListener('pointerup', () => { dragging = false })

  return camera
}

// Snap to the home overview framing (used at boot; Tab uses transitionTo).
export function setOverview() {
  azimuth = 0
  elevation = HOME_ELEVATION
  camera.position.copy(OVERVIEW_POS)
  _lookTarget.set(0, 0, 0)
  camera.lookAt(_lookTarget)
}

// ── Mode transitions (GSAP) ──────────────────────────────────────────────────

// Tween the camera into a new mode. targetBody: the ship for 'flight', the
// scanned body for 'scan'. Mode flips immediately (systems key off it); the
// per-frame controller below takes over when the tween lands. Preemptive: a
// new transition kills an in-flight one and retargets (e.g. closing the scan
// panel before the scan tween has landed must still return to flight).
export function transitionTo(newMode, targetBody = null) {
  gsap.killTweensOf(camera.position)
  gsap.killTweensOf(_lookTarget)
  state.transitioning = true
  state.cameraMode = newMode
  dragging = false

  const destPos = new THREE.Vector3()
  const destLook = new THREE.Vector3()

  if (newMode === 'overview') {
    scanRef = null
    azimuth = 0
    elevation = HOME_ELEVATION
    destPos.copy(OVERVIEW_POS)
    destLook.set(0, 0, 0)
  } else if (newMode === 'flight') {
    scanRef = null
    destPos.copy(CHASE_OFFSET).applyQuaternion(targetBody.group.quaternion)
      .add(targetBody.group.position)
    _fwd.set(0, 0, 1).applyQuaternion(targetBody.group.quaternion)
    destLook.copy(targetBody.group.position).addScaledVector(_fwd, 6)
  } else if (newMode === 'scan') {
    scanRef = targetBody
    scanAngle = 0
    scanOrbitPosition(0, destPos)
    destLook.copy(_wp)   // scanOrbitPosition leaves the body's world pos in _wp
  }

  gsap.to(camera.position, {
    x: destPos.x, y: destPos.y, z: destPos.z,
    duration: TRANSITION_SECS,
    ease: 'power2.inOut',
    onComplete: () => { state.transitioning = false },
  })
  gsap.to(_lookTarget, {
    x: destLook.x, y: destLook.y, z: destLook.z,
    duration: TRANSITION_SECS,
    ease: 'power2.inOut',
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

  if (state.cameraMode === 'flight') {
    if (!ship?.ready) return

    // Rotate the local chase offset into world space using the ship's quaternion
    _offsetWorld.copy(CHASE_OFFSET).applyQuaternion(ship.group.quaternion)
    _desiredPos.copy(ship.group.position).add(_offsetWorld)
    camera.position.lerp(_desiredPos, 0.08)

    // Look at the ship's visual center (+Z*16 from group origin ≈ mid-hull at scale 1)
    _fwd.set(0, 0, 1).applyQuaternion(ship.group.quaternion)
    _lookTarget.copy(ship.group.position).addScaledVector(_fwd, 6)
    camera.lookAt(_lookTarget)

    // Belt turbulence — jitter applied after lookAt so it survives the frame.
    // Tiny amplitude: reads as rattling, not displacement.
    if (state.inAsteroidBelt) {
      const shake = (Math.random() - 0.5) * 0.08
      camera.position.x += shake
      camera.position.y += shake * 0.5
    }

  } else if (state.cameraMode === 'scan') {
    if (!scanRef) return
    // Slow drift around the live body position (it keeps orbiting HELIOS).
    scanAngle += SCAN_ORBIT_SPEED * deltaMs
    scanOrbitPosition(scanAngle, _desiredPos)
    camera.position.lerp(_desiredPos, 0.06)
    _lookTarget.copy(_wp)
    camera.lookAt(_lookTarget)

  } else {
    // Overview: drag-orbit around the origin at fixed radius.
    camera.position.setFromSphericalCoords(
      OVERVIEW_RADIUS, Math.PI / 2 - elevation, azimuth,
    )
    _lookTarget.set(0, 0, 0)
    camera.lookAt(_lookTarget)
  }

  // Speed-rush FOV: widen during turbo or autopilot cruise, ease back otherwise.
  const boosting = state.cameraMode === 'flight' && (state.turbo || state.autopilotActive)
  const targetFov = boosting ? TURBO_FOV : BASE_FOV
  if (Math.abs(camera.fov - targetFov) > 0.04) {
    camera.fov += (targetFov - camera.fov) * 0.08
    camera.updateProjectionMatrix()
  }
}

// Camera position on the scan orbit at the given drift angle. Base direction is
// "away from HELIOS" (the origin) per spec — the star sits behind the body, so
// the scan view gets a backlit silhouette with the atmosphere rim glowing.
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
