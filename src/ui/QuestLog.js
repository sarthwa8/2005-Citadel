import { gsap } from 'gsap'
import * as AudioSystem from '../systems/AudioSystem.js'

// RPG-style objectives checklist (replaces the old minimap + discovery log).
// Each scannable section of the portfolio is an objective that ticks off — with a
// flash + chime — when its body is scanned. A running count shows overall progress.

let itemsEl, countEl, barEl
let total = 0
let done = 0
let onAllComplete = null
const items = new Map()   // body name → { el, completed }

// objectives: [{ name, label, sub }]; allCompleteCb fires once every objective is done.
export function init(objectives, allCompleteCb) {
  itemsEl = document.getElementById('quest-items')
  countEl = document.getElementById('quest-count')
  barEl   = document.getElementById('quest-bar-fill')
  onAllComplete = allCompleteCb || null
  total = objectives.length
  done = 0

  for (const o of objectives) {
    const row = document.createElement('div')
    row.className = 'quest-item'
    row.innerHTML =
      `<span class="quest-check"></span>` +
      `<span class="quest-name">${o.label}</span>` +
      `<span class="quest-sub">${o.sub}</span>`
    itemsEl.appendChild(row)
    items.set(o.name, { el: row, completed: false })
  }
  refresh()
}

// Called when a body is scanned. Unknown names (moons, comet) are ignored.
export function markComplete(name) {
  const it = items.get(name)
  if (!it || it.completed) return
  it.completed = true
  it.el.classList.add('done')
  done++
  refresh()
  AudioSystem.play('objective')
  gsap.fromTo(it.el,
    { backgroundColor: 'rgba(79, 214, 192, 0.28)' },
    { backgroundColor: 'rgba(79, 214, 192, 0)', duration: 1.3, ease: 'power2.out' })

  if (done === total && onAllComplete) onAllComplete()
}

function refresh() {
  if (countEl) countEl.textContent = `${done}/${total}`
  if (barEl) barEl.style.width = `${total ? (done / total) * 100 : 0}%`
}
