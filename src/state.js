import * as THREE from 'three'

export const state = {
  // Camera
  cameraMode: 'overview',
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
}
