import * as THREE from 'three'

// Post-ENTER loading screen. Every loader in the app (textures, GLBs) uses
// THREE.DefaultLoadingManager, so hooking it here — and importing this module
// FIRST in main.js, before any entity constructs a loader — lets us track all
// asset loading and hold the system behind a progress screen until it's ready.

const mgr = THREE.DefaultLoadingManager
let ready = false
let itemsLoaded = 0
let itemsTotal = 0

mgr.onStart    = (url, loaded, total) => { itemsLoaded = loaded; itemsTotal = total }
mgr.onProgress = (url, loaded, total) => { itemsLoaded = loaded; itemsTotal = total }
mgr.onLoad     = () => { ready = true }

let screenEl, barEl, pctEl

export function initLoadingUI() {
  screenEl = document.getElementById('loading-screen')
  barEl    = document.getElementById('loading-bar-fill')
  pctEl    = document.getElementById('loading-pct')
}

// Item-count fraction, capped below 1 until the manager actually reports onLoad
// so the bar never reads 100% before everything is genuinely ready.
function targetFrac() {
  if (ready) return 1
  return itemsTotal > 0 ? Math.min(itemsLoaded / itemsTotal, 0.92) : 0.04
}

// Show the loading screen and resolve once assets are ready AND a minimum display
// time has passed (so it never flashes), easing the bar smoothly to 100%.
// Driven by setInterval, NOT requestAnimationFrame: rAF pauses in a hidden tab, so
// a tabbed-away user (or the headless preview) would otherwise hang here forever.
export function runLoading({ minMs = 700 } = {}) {
  return new Promise(resolve => {
    if (!screenEl) return resolve()
    screenEl.classList.add('active')
    const start = performance.now()
    let shown = 0

    const iv = setInterval(() => {
      shown += (targetFrac() - shown) * 0.18
      if (ready && performance.now() - start >= minMs) shown = 1   // snap to done once ready
      const pct = Math.round(shown * 100)
      barEl.style.width = pct + '%'
      pctEl.textContent = pct + '%'

      if (shown >= 1) {
        clearInterval(iv)
        screenEl.classList.add('done')          // CSS fades opacity → 0
        setTimeout(() => { screenEl.style.display = 'none'; resolve() }, 650)
      }
    }, 40)
  })
}

export function assetsReady() { return ready }
