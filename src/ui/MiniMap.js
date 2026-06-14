import { state } from '../state.js'

// Top-down 2D canvas map (top-left HUD). World X/Z maps to canvas X/Y, HELIOS at
// center. Redraws are throttled to every 500ms — orbital motion is slow enough
// that the map stays accurate, and the canvas work stays off the frame budget.

const SIZE = 140                 // CSS pixels (matches #minimap styling)
const REDRAW_MS = 500
const WORLD_RADIUS = 320         // CODEX orbit (285) + outer moons, with margin
const BELT_RADIUS = 200

let canvas, ctx, planets, asteroidBelt, station
let scale = 1
let half = SIZE / 2
let lastDraw = 0

export function init(deps) {
  planets = deps.planets
  asteroidBelt = deps.asteroidBelt
  station = deps.station
  canvas = document.getElementById('minimap')

  // Back the 140px CSS box with a DPR-sized buffer so dots stay crisp on retina.
  const dpr = window.devicePixelRatio || 1
  canvas.width = SIZE * dpr
  canvas.height = SIZE * dpr
  ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  scale = (half - 6) / WORLD_RADIUS   // 6px margin inside the border

  draw()   // first frame immediately; updates throttle from here
}

export function update() {
  const now = performance.now()
  if (now - lastDraw < REDRAW_MS) return
  lastDraw = now
  draw()
}

function draw() {
  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = 'rgba(5, 8, 16, 0.85)'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Orbit rings
  ctx.strokeStyle = 'rgba(26, 152, 136, 0.18)'
  ctx.lineWidth = 1
  for (const planet of planets) {
    ctx.beginPath()
    ctx.arc(half, half, planet.config.orbitRadius * scale, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Asteroid belt — slightly wider, fainter ring
  ctx.strokeStyle = 'rgba(180, 150, 100, 0.25)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(half, half, BELT_RADIUS * scale, 0, Math.PI * 2)
  ctx.stroke()

  // HELIOS
  ctx.fillStyle = '#FFE9B0'
  dot(0, 0, 3)

  // Planets, tinted with their label color
  for (const planet of planets) {
    const p = planet.worldPosition()
    ctx.fillStyle = planet.config.labelColor
    dot(p.x, p.z, 2.5)
  }

  // NOVARA station
  if (station) {
    const sp = station.worldPosition()
    ctx.fillStyle = station.config.labelColor
    dot(sp.x, sp.z, 1.8)
  }

  // Ship — bright teal, drawn last so it sits on top
  const s = state.shipPosition
  ctx.fillStyle = '#48C9B0'
  dot(s.x, s.z, 2)
  ctx.strokeStyle = 'rgba(72, 201, 176, 0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(half + s.x * scale, half + s.z * scale, 4.5, 0, Math.PI * 2)
  ctx.stroke()
}

function dot(worldX, worldZ, r) {
  ctx.beginPath()
  ctx.arc(half + worldX * scale, half + worldZ * scale, r, 0, Math.PI * 2)
  ctx.fill()
}
