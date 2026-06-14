import * as THREE from 'three'
import { initScene, initComposerPasses, composer, css2DRenderer } from './core/scene.js'
import { initCamera, camera, updateCamera, transitionTo } from './core/camera.js'
import { state } from './state.js'
import { Star } from './entities/Star.js'
import { Starfield } from './entities/Starfield.js'
import { Nebula } from './entities/Nebula.js'
import { Planet } from './entities/Planet.js'
import { AsteroidBelt } from './entities/AsteroidBelt.js'
import { Station } from './entities/Station.js'
import { Comet } from './entities/Comet.js'
import { DarkZone } from './entities/DarkZone.js'
import { Ship } from './entities/Ship.js'
import * as InputSystem from './systems/InputSystem.js'
import * as OrbitalMechanics from './systems/OrbitalMechanics.js'
import * as ProximitySystem from './systems/ProximitySystem.js'
import * as ScanSystem from './systems/ScanSystem.js'
import * as AutopilotSystem from './systems/AutopilotSystem.js'
import * as AudioSystem from './systems/AudioSystem.js'
import * as HUD from './ui/HUD.js'
import * as QuestLog from './ui/QuestLog.js'
import { initLanding } from './ui/Landing.js'
import { PLANET_CONFIGS, STATION_CONFIG } from './data/planetConfigs.js'
import { BODIES } from './data/bodies.js'

// ── Bootstrap ──────────────────────────────────────────────────────────────

const threeScene = new THREE.Scene()

initScene(threeScene)
initCamera()
initComposerPasses(camera)
InputSystem.init()

// ── Entities ───────────────────────────────────────────────────────────────

const nebula = new Nebula()
threeScene.add(nebula.group)

const star = new Star()
threeScene.add(star.group)

const starfield = new Starfield()
threeScene.add(starfield.group)

// All 5 planets, instantiated from config
const planets = PLANET_CONFIGS.map(cfg => new Planet(cfg))
for (const planet of planets) threeScene.add(planet.orbitGroup)

// Asteroid belt — single InstancedMesh draw call, loads its own GLB
const asteroidBelt = new AsteroidBelt()
threeScene.add(asteroidBelt.group)

// NOVARA station — Contact body, orbits on CODEX's ring but offset + inclined
const station = new Station(STATION_CONFIG)
threeScene.add(station.orbitGroup)

// Comet — appears once per session after a delay, crosses the system, leaves
const comet = new Comet()
threeScene.add(comet.group)

// Dark zone — charted-space boundary grid + soft pushback
const darkZone = new DarkZone()
threeScene.add(darkZone.mesh)

const ship = new Ship()
ship.group.position.set(0, 0, 70)   // start between star outer glow (r=30) and GENESIS orbit (r=90)
state.shipPosition.copy(ship.group.position)   // seed so HUD/minimap are right pre-flight
threeScene.add(ship.group)

// ── Systems that need entity refs ──────────────────────────────────────────

ProximitySystem.init(planets, station, comet)
ScanSystem.init({ scene: threeScene, ship })
AutopilotSystem.init({ ship })
HUD.init()

// Quest objectives — one per scannable portfolio section (planets + station)
QuestLog.init([...planets, station].map(b => ({
  name:  b.config.name,
  label: b.config.name,
  sub:   BODIES[b.config.bodyKey]?.heading ?? '',
})))

// ── Audio — browsers block sound until a user gesture, so arm it on the first
// keypress or click (whichever comes first), then the gate removes itself ────

const armAudio = () => {
  AudioSystem.init()
  window.removeEventListener('keydown', armAudio)
  window.removeEventListener('pointerdown', armAudio)
}
window.addEventListener('keydown', armAudio)
window.addEventListener('pointerdown', armAudio)

// ── Autopilot — click a body's label in overview to fly there ──────────────

for (const body of [...planets, station]) {
  body.labelEl.classList.add('label-clickable')
  body.labelEl.addEventListener('click', () => {
    if (state.cameraMode !== 'overview' || state.transitioning || !ship.ready) return
    AudioSystem.play('uiClick')
    AutopilotSystem.flyTo(body)
    transitionTo('flight', ship)
  })
}

// ── Input — mode toggle ────────────────────────────────────────────────────

window.addEventListener('keydown', e => {
  if (e.code === 'Tab') {
    e.preventDefault()
    if (state.cameraMode === 'overview' && ship.ready) {
      transitionTo('flight', ship)
    } else if (state.cameraMode === 'flight') {
      transitionTo('overview')
    }
  }
})

// ── Game loop ──────────────────────────────────────────────────────────────

// Global slowdown for orbital motion (planets, moons, station, belt). The raw
// config speeds were tuned fast; ~10× slower makes bodies comfortably scannable.
const ORBIT_SCALE = 0.1

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  // Clamp delta: rAF pauses in hidden tabs, so the first frame back reports the
  // whole hidden period — unclamped, every orbit teleports and ship physics jump.
  const delta   = Math.min(clock.getDelta(), 0.05)
  const elapsed = clock.elapsedTime
  const deltaMs = delta * 1000   // orbital speeds are in rad/ms per spec

  star.update(elapsed)

  // Orbital motion runs on a slowed clock so planets/moons drift gently enough to
  // approach and scan. The comet keeps real time so its one-shot timing is intact.
  const orbitalMs = deltaMs * ORBIT_SCALE
  OrbitalMechanics.update(planets, orbitalMs)
  asteroidBelt.update(orbitalMs)
  station.update(orbitalMs, elapsed)
  comet.update(deltaMs)

  // Ship (manual physics only in flight mode, not mid-transition, not on autopilot)
  if (!state.transitioning && state.cameraMode === 'flight' && !state.autopilotActive) {
    ship.update(delta)
  }
  AutopilotSystem.update(delta)
  darkZone.update(delta)

  ProximitySystem.update()
  AudioSystem.update()

  // UI
  HUD.update()

  // Camera
  updateCamera(ship, deltaMs)

  composer.render()
  css2DRenderer.render(threeScene, camera)
}

animate()

// ── Landing / briefing — first screen; ENTER arms audio and reveals the system ──

initLanding(() => { AudioSystem.init(); AudioSystem.play('uiClick') })
