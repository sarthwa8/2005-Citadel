import * as THREE from 'three'
import { gsap } from 'gsap'
import { state } from '../state.js'
import { transitionTo } from '../core/camera.js'
import * as InfoPanel from '../ui/InfoPanel.js'
import * as QuestLog from '../ui/QuestLog.js'
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

  // 2. A clean holographic wireframe sphere materializes around the target and
  // rotates — reads as the scan "locking on", far crisper than overlapping blobs.
  spawnScanSphere(target)

  // 3. On pulse arrival: open panel, log discovery, unlock moons (first scan only)
  setTimeout(() => {
    state.scanActive = false
    state.panelOpen = true

    if (!state.discoveredBodies.has(target.config.name)) {
      state.discoveredBodies.add(target.config.name)
      state.discoveryOrder.push(target.config.name)
      QuestLog.markComplete(target.config.name)
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

// Holographic scan: a wireframe sphere + a thin equatorial ring both materialize
// around the target, scale up with a slight overshoot, rotate, then fade as the
// dossier opens. Parented to the target so it tracks the body's orbital motion.
function spawnScanSphere(target) {
  const r = (target.config?.radius ?? 5) * 1.25
  const parent = target.planetGroup || target.stationGroup || target.group || scene

  const grp = new THREE.Group()
  grp.scale.setScalar(0.01)
  parent.add(grp)

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(r, 22, 16),
    new THREE.MeshBasicMaterial({ color: 0x7FE9FF, wireframe: true, transparent: true, opacity: 0, depthWrite: false })
  )
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(r * 1.12, r * 0.012, 6, 80),
    new THREE.MeshBasicMaterial({ color: 0xBFF4FF, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  )
  ring.rotation.x = Math.PI / 2
  grp.add(sphere, ring)

  const cleanup = () => {
    parent.remove(grp)
    sphere.geometry.dispose(); sphere.material.dispose()
    ring.geometry.dispose(); ring.material.dispose()
  }

  gsap.to(grp.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(2)' })
  gsap.to(sphere.material, { opacity: 0.5, duration: 0.3 })
  gsap.to(ring.material,   { opacity: 0.9, duration: 0.3 })
  gsap.to(grp.rotation,    { y: Math.PI * 1.4, duration: 1.6, ease: 'none' })
  gsap.to([sphere.material, ring.material], { opacity: 0, duration: 0.5, delay: 1.0, onComplete: cleanup })
}
