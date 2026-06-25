// Minimal landing / launch gate. The live system renders behind a translucent veil
// (so the landing IS the real space). The name fades in via CSS (no text effects).
// ENTER arms audio and hands off to the cinematic warp-in sequenced in main.js.

export function initLanding(onEnter) {
  const landing = document.getElementById('landing')

  const enter = () => {
    if (landing.classList.contains('dismissed')) return
    landing.classList.add('dismissed')
    onEnter?.()
    setTimeout(() => { landing.style.display = 'none' }, 1050)
  }

  document.getElementById('enter-btn').addEventListener('click', enter)
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Enter' || e.code === 'Space') &&
        !landing.classList.contains('dismissed')) {
      e.preventDefault()
      enter()
    }
  })
}
