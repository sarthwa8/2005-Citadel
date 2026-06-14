// Landing / briefing overlay. A canvas spiral-galaxy background (a vanilla port of
// React Bits' "Galaxy" — drifting, twinkling, mouse-parallaxed particles), the
// title split into per-character spans for a staggered reveal (SplitText), and an
// ENTER gate that arms audio and dismisses the overlay into the live system.

export function initLanding(onEnter) {
  const landing = document.getElementById('landing')
  const canvas = document.getElementById('galaxy-canvas')
  const ctx = canvas.getContext('2d')

  splitTitle()
  const stop = startGalaxy(canvas, ctx)

  const enter = () => {
    if (landing.classList.contains('dismissed')) return
    landing.classList.add('dismissed')
    onEnter?.()
    setTimeout(() => {
      landing.style.display = 'none'
      stop()
    }, 1050)
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

// ── SplitText: wrap each title glyph so CSS can stagger it in ─────────────────
function splitTitle() {
  const title = document.getElementById('landing-title')
  const text = title.textContent
  title.textContent = ''
  let i = 0
  for (const ch of text) {
    const span = document.createElement('span')
    span.className = 'char'
    span.textContent = ch === ' ' ? ' ' : ch
    span.style.setProperty('--i', i++)
    title.appendChild(span)
  }
}

// ── Galaxy: spiral-armed, twinkling particle field on a 2D canvas ────────────
function startGalaxy(canvas, ctx) {
  const ARMS = 2
  const WINDINGS = 2.3
  let W, H, cx, cy, dpr, maxR
  let stars = []

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = canvas.clientWidth; H = canvas.clientHeight
    canvas.width = Math.max(1, W * dpr)
    canvas.height = Math.max(1, H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cx = W / 2; cy = H / 2
    maxR = Math.hypot(W, H) * 0.42

    stars = []
    const count = Math.min(620, Math.floor((W * H) / 2600))

    // Spiral-arm stars
    for (let i = 0; i < count; i++) {
      const arm = i % ARMS
      const t = Math.pow(Math.random(), 0.7)                 // bias toward the core
      const spread = (1 - t) * 0.6 + 0.08
      const angle = t * WINDINGS * Math.PI * 2
                  + (arm / ARMS) * Math.PI * 2
                  + (Math.random() - 0.5) * spread
      const r = t * maxR + (Math.random() - 0.5) * maxR * 0.06
      const warm = Math.random() < 0.5 - t * 0.4
      const col = warm
        ? [255, 222, 170]
        : (Math.random() < 0.6 ? [205, 238, 255] : [126, 240, 216])
      stars.push({
        angle, r,
        size: Math.random() * 1.6 + 0.4,
        base: Math.random() * 0.5 + 0.32,
        tw: Math.random() * Math.PI * 2,
        twSpeed: Math.random() * 2 + 1,
        col, bg: false,
      })
    }
    // Sparse far-field stars
    for (let i = 0; i < count * 0.4; i++) {
      stars.push({
        angle: Math.random() * Math.PI * 2,
        r: Math.random() * maxR * 1.35,
        size: Math.random() * 1.1 + 0.2,
        base: Math.random() * 0.3 + 0.1,
        tw: Math.random() * Math.PI * 2,
        twSpeed: Math.random() * 2 + 0.5,
        col: [205, 222, 240], bg: true,
      })
    }
  }

  let mx = 0, my = 0, tmx = 0, tmy = 0
  const onMove = e => {
    tmx = e.clientX / window.innerWidth - 0.5
    tmy = e.clientY / window.innerHeight - 0.5
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('resize', build)

  let raf, running = true
  const start = performance.now()

  function frame(now) {
    if (!running) return
    const t = (now - start) / 1000
    mx += (tmx - mx) * 0.05
    my += (tmy - my) * 0.05
    ctx.clearRect(0, 0, W, H)

    // Core glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.42)
    g.addColorStop(0, 'rgba(96, 165, 230, 0.12)')
    g.addColorStop(0.4, 'rgba(79, 214, 192, 0.05)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    const rot = t * 0.04
    const px = mx * 28, py = my * 28
    for (const s of stars) {
      const a = s.angle + rot * (s.bg ? 0.3 : 1)
      const x = cx + Math.cos(a) * s.r + px * (s.bg ? 0.4 : 1)
      const y = cy + Math.sin(a) * s.r * 0.62 + py * (s.bg ? 0.4 : 1)   // squash → disc tilt
      const tw = 0.5 + 0.5 * Math.sin(s.tw + t * s.twSpeed)
      const alpha = s.base * (0.4 + 0.6 * tw)
      ctx.beginPath()
      ctx.arc(x, y, s.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${s.col[0]}, ${s.col[1]}, ${s.col[2]}, ${alpha})`
      ctx.fill()
    }
    raf = requestAnimationFrame(frame)
  }

  build()
  raf = requestAnimationFrame(frame)

  return () => {
    running = false
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('resize', build)
  }
}
