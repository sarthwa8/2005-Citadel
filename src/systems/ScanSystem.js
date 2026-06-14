import * as THREE from 'three'
import { gsap } from 'gsap'
import { state } from '../state.js'
import { transitionTo } from '../core/camera.js'
import * as InfoPanel from '../ui/InfoPanel.js'
import * as DiscoveryLog from '../ui/DiscoveryLog.js'
import * as AudioSystem from './AudioSystem.js'

// The scan loop: E in range → ship ring flares + a teal pulse sphere expands from
// the ship to the target → on arrival the info panel opens, the body is logged,
// and (first scan of a planet) its moons unlock. E/Escape/[CLOSE] dismisses.
//
// Event-driven — no per-frame update. GSAP owns the animations, a setTimeout
// matched to the pulse flight time (650ms) triggers the "arrival".

let scene = null
let ship = null

const PULSE_FLIGHT_MS = 650

export function init(deps) {
  scene = deps.scene
  ship = deps.ship

  window.addEventListener('keydown', e => {
    if (e.code === 'KeyE') {
      if (state.panelOpen) closePanel()
      else triggerScan()
    } else if (e.code === 'Escape' && state.panelOpen) {
      closePanel()
    }
  })

  InfoPanel.init(closePanel)
  DiscoveryLog.init()
}

function triggerScan() {
  if (!state.inScanRange || state.scanActive || state.panelOpen) return
  if (state.cameraMode !== 'flight') return
  if (!ship?.ready) return

  const target = state.nearestBody
  state.scanActive = true
  state.scanTarget = target
  AudioSystem.play('scanFire')

  // 1. Scan ring flares and expands around the ship
  gsap.to(ship.scanRing.material, { opacity: 0.7, duration: 0.1 })
  gsap.to(ship.scanRing.scale, {
    x: 3, y: 3, z: 3, duration: 0.6,
    onComplete: () => {
      gsap.to(ship.scanRing.material, {
        opacity: 0, duration: 0.2,
        onComplete: () => ship.scanRing.scale.setScalar(1),
      })
    },
  })

  // 2. Pulse sphere expands from the ship until its shell reaches the target,
  // with two fainter echo ripples trailing it (the "scan trail")
  spawnScanPulse(ship.group.position, target, 0.55, 0)
  spawnScanPulse(ship.group.position, target, 0.28, 130)
  spawnScanPulse(ship.group.position, target, 0.14, 260)

  // 3. On pulse arrival: open panel, log discovery, unlock moons (first scan only)
  setTimeout(() => {
    state.scanActive = false
    state.panelOpen = true

    if (!state.discoveredBodies.has(target.config.name)) {
      state.discoveredBodies.add(target.config.name)
      state.discoveryOrder.push(target.config.name)
      DiscoveryLog.addEntry(target.config.label ?? target.config.name)
      target.moons?.forEach(m => m.unlock())
      if (target.config.bodyKey === 'COMET') state.cometScanned = true
    }

    InfoPanel.show(target)
    // Camera tweens out to frame the body, then drifts around it while the
    // panel is open. Flight (and the ship) freeze until the panel closes.
    transitionTo('scan', target)
    AudioSystem.play('scanDone')
  }, PULSE_FLIGHT_MS)
}

function closePanel() {
  if (!state.panelOpen) return
  InfoPanel.hide()
  state.panelOpen = false
  state.scanTarget = null
  transitionTo('flight', ship)
}

// Expanding BackSide sphere — reads as a wavefront washing over the target.
// depthWrite:false so the transparent shell never cuts holes in geometry.
// peakOpacity/delayMs let triggerScan stagger fainter echo ripples behind the
// main front so the scan reads as a trail of waves rather than one shell.
function spawnScanPulse(origin, target, peakOpacity = 0.55, delayMs = 0) {
  const geo = new THREE.SphereGeometry(1, 24, 24)
  const mat = new THREE.MeshBasicMaterial({
    color: 0x48C9B0, transparent: true, opacity: peakOpacity,
    depthWrite: false, side: THREE.BackSide,
  })
  const pulse = new THREE.Mesh(geo, mat)
  pulse.position.copy(origin)
  scene.add(pulse)

  const dist = origin.distanceTo(target.worldPosition())
  gsap.to(pulse.scale, {
    x: dist, y: dist, z: dist,
    duration: PULSE_FLIGHT_MS / 1000,
    delay: delayMs / 1000,
    ease: 'power1.out',
    onUpdate: function () {
      mat.opacity = peakOpacity * (1 - this.progress())
    },
    onComplete: () => {
      scene.remove(pulse)
      geo.dispose()
      mat.dispose()
    },
  })
}
