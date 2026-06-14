import { state } from '../state.js'

// Minimal HUD. The only on-screen prompt is "E · SCAN <body>", shown when the ship
// is within scan range in flight mode (and no panel is open). The old coordinate /
// proximity banner, mode indicator, and controls hint were removed for a clean view.

let promptEl, targetEl

export function init() {
  promptEl = document.getElementById('scan-prompt')
  targetEl = promptEl?.querySelector('.scan-target')
}

export function update() {
  if (!promptEl) return
  const show = state.inScanRange && state.cameraMode === 'flight' && !state.panelOpen
  promptEl.classList.toggle('visible', show)
  if (show && targetEl) {
    targetEl.textContent = state.nearestBody.config.label ?? state.nearestBody.config.name
  }
}
