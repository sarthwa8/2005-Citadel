// Minimal landing / launch gate. The live system renders behind a translucent veil
// (so the landing IS the real space), and the name does a DecryptedText reveal.
// ENTER arms audio and hands off to the cinematic warp-in sequenced in main.js.

export function initLanding(onEnter) {
  const landing = document.getElementById('landing')
  splitTitle()

  const enter = () => {
    if (landing.classList.contains('dismissed')) return
    landing.classList.add('dismissed')
    onEnter?.()
    setTimeout(() => { landing.style.display = 'none' }, 1050)
  }

  document.getElementById('enter-btn').addEventListener('click', enter)
  window.addEventListener('keydown', e => {
    if ((e.code === 'Enter' || e.code === 'Space') &&
        !landing.classList.contains('dismissed')) {
      e.preventDefault()
      enter()
    }
  })
}

// ── DecryptedText: split the title into per-glyph spans, scramble each through
// random glyphs, then "lock" it to the real character left→right. Driven by
// setInterval (not rAF) so it still plays in a backgrounded/preview tab. ──────────
const DECRYPT_GLYPHS = '!<>-_\\/[]{}=+*^?#%@ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
const rndGlyph = () => DECRYPT_GLYPHS[(Math.random() * DECRYPT_GLYPHS.length) | 0]

function splitTitle() {
  const title = document.getElementById('landing-title')
  const text = title.textContent
  title.textContent = ''
  const spans = []
  let i = 0
  for (const ch of text) {
    const span = document.createElement('span')
    span.className = 'char'
    span.style.setProperty('--i', i++)
    if (ch === ' ') { span.textContent = ' '; span._settled = true }
    else { span._final = ch; span.textContent = rndGlyph() }
    title.appendChild(span)
    spans.push(span)
  }

  const start = performance.now()
  const PER = 80      // ms before each successive glyph locks in
  const SETTLE = 420  // base scramble time
  const iv = setInterval(() => {
    const t = performance.now() - start
    let allDone = true
    spans.forEach((span, idx) => {
      if (span._settled) return
      if (t >= idx * PER + SETTLE) { span.textContent = span._final; span._settled = true }
      else { span.textContent = rndGlyph(); allDone = false }
    })
    if (allDone) clearInterval(iv)
  }, 45)
}
