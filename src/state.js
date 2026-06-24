import * as THREE from 'three'

export const state = {
  // Camera. cameraMode: 'flight' | 'scan' (the old fixed 'overview' map is gone).
  // flightCam picks the flight framing: 'map' = ME-style cinematic iso follow,
  // 'drive' = close behind-the-ship chase. Tab toggles them.
  cameraMode: 'flight',
  flightCam: 'map',
  transitioning: false,

  // Ship
  shipVelocity: new THREE.Vector3(),
  shipPosition: new THREE.Vector3(),
  thrustInput: new THREE.Vector3(),

  // Bodies
  nearestBody: null,
  nearestBodyDistance: Infinity,
  inScanRange: false,

  // Scan
  scanTarget: null,
  scanActive: false,
  panelOpen: false,

  // Discovery
  discoveredBodies: new Set(),
  discoveryOrder: [],

  // Autopilot
  autopilotActive: false,
  autopilotTarget: null,

  // Comet
  cometVisible: false,
  cometScanned: false,

  // Polish (Phase 16)
  inAsteroidBelt: false,   // ship inside the belt torus → camera turbulence
  inDarkZone: false,       // ship beyond the charted boundary → HUD warning + pushback

  // Flight
  turbo: false,            // turbo boost engaged (Shift + W) → speed + FOV + thrusters
}
