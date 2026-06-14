import { gsap } from 'gsap'

// Append-only log of scanned bodies (top-right HUD). Entries slide in via GSAP.
// .log-entry starts at opacity 0 / translateY(-8px) in CSS; we tween to rest.

let entriesEl = null

export function init() {
  entriesEl = document.getElementById('log-entries')
}

export function addEntry(name) {
  if (!entriesEl) return
  const div = document.createElement('div')
  div.className = 'log-entry'
  div.textContent = `▸ ${name}`
  entriesEl.appendChild(div)
  gsap.to(div, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' })
}
