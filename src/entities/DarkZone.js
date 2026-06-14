import * as THREE from 'three'
import { state } from '../state.js'

// The charted-space boundary. CODEX/NOVARA orbit at 285; beyond ~600 there is
// nothing to find, so the boundary keeps visitors from drifting into the void:
//
//  - A faint wireframe containment grid (r = BOUNDARY + margin) that is
//    invisible until the ship gets close, then fades in as a warning.
//  - state.inDarkZone for the HUD warning line.
//  - A soft pushback past the boundary: inward acceleration grows with
//    overshoot, so the ship decelerates, stalls, and gets nudged home —
//    no hard wall, no teleport.
//
// Starfield spans 350–2500, so the grid sits inside it; wireframe doesn't
// occlude the stars behind it.

const BOUNDARY        = 600   // pushback + HUD warning beyond this radius
const GRID_RADIUS     = 640   // visual shell, slightly outside the boundary
const FADE_START      = 500   // grid begins to appear here
const MAX_GRID_OPACITY = 0.12
// Inward acceleration per unit of overshoot (u/s² per unit). At 0.5, the wall
// matches the ship's full thrust (50 u/s²) ~100 units past the boundary — the
// deepest any pilot can push before stalling out.
const PUSHBACK_PER_UNIT = 0.5

export class DarkZone {
  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(GRID_RADIUS, 48, 24),
      new THREE.MeshBasicMaterial({
        color: 0x1A6B7A, wireframe: true,
        transparent: true, opacity: 0, depthWrite: false,
      })
    )
    this.mesh.visible = false
    this._inward = new THREE.Vector3()
  }

  // delta in seconds (drives the pushback acceleration)
  update(delta) {
    const r = state.shipPosition.length()

    // Grid fade: 0 at FADE_START → max at BOUNDARY (and beyond)
    const fade = THREE.MathUtils.clamp((r - FADE_START) / (BOUNDARY - FADE_START), 0, 1)
    this.mesh.material.opacity = fade * MAX_GRID_OPACITY
    this.mesh.visible = fade > 0.001

    state.inDarkZone = r > BOUNDARY

    // Soft wall: only acts on the velocity, and only while past the boundary,
    // so manual flight stays responsive — the void just pushes back harder
    // the deeper you go.
    if (state.inDarkZone && r > 1e-3) {
      const overshoot = r - BOUNDARY
      this._inward.copy(state.shipPosition).multiplyScalar(-1 / r)   // unit vector home
      state.shipVelocity.addScaledVector(this._inward, overshoot * PUSHBACK_PER_UNIT * delta)
    }
  }
}
