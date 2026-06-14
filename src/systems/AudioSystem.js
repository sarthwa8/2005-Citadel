import { Howl } from 'howler'
import * as THREE from 'three'
import { state } from '../state.js'
import { MAX_SPEED } from '../entities/Ship.js'

// Howler-backed audio, driven by game state each frame. init() must be called
// from a user-gesture handler (browsers block audio until interaction — see
// main.js, which arms it on the first keydown/pointerdown).
//
// Audio files are dropped into /public/audio manually (see the README there).
// Missing files degrade silently: Howler fires onloaderror, we log once and
// every play()/volume() call on that sound stays a safe no-op.

const sounds = {}
const reported = new Set()   // Howler fires loaderror per queued action — log once
let ready = false

const MANIFEST = {
  ambient:    { src: '/audio/ambient_space.mp3',  loop: true,  volume: 0.28 },
  proximity:  { src: '/audio/proximity_tone.mp3', loop: false, volume: 0.5  },
  scanFire:   { src: '/audio/scan_fire.mp3',      loop: false, volume: 0.7  },
  scanDone:   { src: '/audio/scan_complete.mp3',  loop: false, volume: 0.65 },
  moonUnlock: { src: '/audio/moon_unlock.mp3',    loop: false, volume: 0.6  },
  thruster:   { src: '/audio/thruster.mp3',       loop: true,  volume: 0    },
  comet:      { src: '/audio/comet_detected.mp3', loop: false, volume: 0.55 },
}

export function init() {
  if (ready) return
  ready = true

  for (const [key, cfg] of Object.entries(MANIFEST)) {
    sounds[key] = new Howl({
      src: [cfg.src],
      loop: cfg.loop,
      volume: cfg.volume,
      onloaderror: () => {
        if (!reported.has(key)) {
          reported.add(key)
          console.info(`[Audio] ${cfg.src} not found — drop it in public/audio/ to enable`)
        }
        sounds[key]?.unload()
        sounds[key] = null
      },
    })
  }

  // The two persistent loops start now (we're inside a user gesture, so allowed);
  // thruster idles at volume 0 and update() rides it up with ship speed.
  sounds.ambient?.play()
  sounds.thruster?.play()
}

// One-shots fired by game systems: 'scanFire', 'scanDone', 'moonUnlock', 'comet'.
export function play(key) {
  if (!ready) return
  sounds[key]?.play()
}

// Called every frame from the game loop.
export function update() {
  if (!ready) return

  // Thruster swells with ship speed (manual or autopilot — both set shipVelocity)
  if (sounds.thruster) {
    const speed = state.shipVelocity.length()
    sounds.thruster.volume(THREE.MathUtils.clamp((speed / MAX_SPEED) * 0.4, 0, 0.4))
  }

  // Proximity tone rises as the ship closes on a scannable body
  if (sounds.proximity) {
    if (state.inScanRange && !state.panelOpen && state.nearestBody) {
      const vol = 1 - state.nearestBodyDistance / (state.nearestBody.config.scanRadius ?? 35)
      sounds.proximity.volume(Math.max(0, vol) * 0.5)
      if (!sounds.proximity.playing()) sounds.proximity.play()
    } else {
      sounds.proximity.volume(0)
    }
  }
}
