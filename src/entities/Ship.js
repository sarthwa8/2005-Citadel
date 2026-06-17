import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { state } from '../state.js'
import * as InputSystem from '../systems/InputSystem.js'
import * as AudioSystem from '../systems/AudioSystem.js'
import { renderer } from '../core/scene.js'
import { makeGlowSprite } from '../core/glow.js'

// Shared PMREM environment for the ship's PBR materials. HELIOS is the only real
// scene light, so metallic/specular surfaces have nothing to reflect and read
// flat. A neutral studio environment applied per-material (NOT scene.environment,
// which would wash the planets) gives the hull a subtle sheen from every angle.
let _envTexture = null
function getEnvTexture() {
  if (!_envTexture) {
    const pmrem = new THREE.PMREMGenerator(renderer)
    _envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
  }
  return _envTexture
}

// World up — vertical reference for thrust and yaw.
const WORLD_UP = new THREE.Vector3(0, 1, 0)

// Tunable flight constants
// The model is auto-normalized on load: recentered to the group origin and scaled
// so its longest axis = SHIP_LENGTH. This makes the ship a known size regardless
// of the export's native units, so the camera/engine tuning below stays valid
// even if the model is swapped again. SHIP_MODEL_YAW points the nose down -Z.
const SHIP_LENGTH    = 16
const SHIP_MODEL_YAW = Math.PI / 2   // model's long axis is X; rotate so the nose faces -Z
const THRUST_FORCE = 50    // units/s² acceleration
export const MAX_SPEED = 25   // units/s top speed (AudioSystem scales thruster volume off this)
const DRAG         = 0.97  // velocity multiplier per frame (~framerate dependent but acceptable)
const TURN_RATE    = 1.7   // rad/s yaw speed for A/D
const BANK_MAX     = 0.45  // rad — visual roll into turns (model-only, camera stays level)
const PITCH_MAX    = 0.3   // rad — visual nose pitch from vertical velocity (model-only)

// Turbo (hold Shift + W): a big speed/accel boost with flared thrusters + wider FOV.
const TURBO_SPEED_MULT  = 2.6
const TURBO_THRUST_MULT = 2.5

// Rear thruster glow sprites — positions in ship-local GROUP space (rear = +Z).
const THRUSTER_OFFSETS = [
  new THREE.Vector3(-3.1, 0, 7.4),
  new THREE.Vector3( 3.1, 0, 7.4),
]

export class Ship {
  constructor() {
    this.group = new THREE.Group()
    this.ready = false
    this.model = null
    this.fillLight = null

    // Reusable temporaries for the per-frame orientation slerp (avoid per-frame allocs)
    this._orientHelper = new THREE.Object3D()
    this._tmpTarget    = new THREE.Vector3()
    this._facePoint    = new THREE.Vector3()

    // Reusable temporaries for heading-based flight (avoid per-frame allocs)
    this._forward     = new THREE.Vector3()
    this._thrustWorld = new THREE.Vector3()
    this._headingQuat = new THREE.Quaternion()
    this._headingEuler = new THREE.Euler(0, 0, 0, 'YXZ')

    // Smoothed control inputs for the visual bank/pitch
    this._smoothYaw = 0
    this._wasTurbo = false

    // Logical heading (rad). Persistent across frames — deriving it from the
    // slerp-lagged quaternion every frame would throttle the turn rate to
    // slerp-factor × TURN_RATE. _headingSynced drops whenever an external
    // driver (autopilot's faceVelocity) rotates the group, forcing a re-sync.
    this._heading = 0
    this._headingSynced = false

    // Scan ring — hidden until ScanSystem activates it (Phase 9)
    const ringGeo = new THREE.TorusGeometry(30, 0.4, 8, 64)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x48C9B0, transparent: true, opacity: 0, depthWrite: false,
    })
    this.scanRing = new THREE.Mesh(ringGeo, ringMat)
    this.scanRing.rotation.x = Math.PI / 2
    this.group.add(this.scanRing)

    // Load GLTF
    // The ship GLB is Draco-compressed (120MB → ~7MB), so the GLTFLoader needs a
    // DRACOLoader to decode its geometry. The decoder lives in /public/draco so
    // there's no external CDN dependency at runtime.
    const loader = new GLTFLoader()
    const draco = new DRACOLoader()
    draco.setDecoderPath('/draco/')
    loader.setDRACOLoader(draco)
    loader.load(
      '/models/new_ship_model_c.glb',
      gltf => this._onLoad(gltf),
      undefined,
      err => console.error('[Ship] GLTF load failed:', err)
    )
  }

  _onLoad(gltf) {
    // Three-level nesting keeps recenter, base orientation, and runtime bank/pitch
    // from fighting each other:
    //   gltf.scene  — uniform scale + recenter to origin (rotation 0)
    //   yawNode     — fixed base yaw so the model's nose faces -Z
    //   this.model  — holder; update() applies bank (z) / pitch (x) here only
    // Because recenter is on the innermost node, the yaw and bank/pitch above it
    // all rotate cleanly about the model's center.
    const box = new THREE.Box3().setFromObject(gltf.scene)
    const size = new THREE.Vector3();   box.getSize(size)
    const center = new THREE.Vector3(); box.getCenter(center)
    const longest = Math.max(size.x, size.y, size.z) || 1
    const s = SHIP_LENGTH / longest
    gltf.scene.scale.setScalar(s)
    gltf.scene.position.copy(center).multiplyScalar(-s)   // recenter to origin

    const yawNode = new THREE.Group()
    yawNode.rotation.y = SHIP_MODEL_YAW
    yawNode.add(gltf.scene)

    const holder = new THREE.Group()
    holder.add(yawNode)

    this.model = holder
    console.log('[Ship] model raw dims', size.toArray().map(n => +n.toFixed(2)), '→ scale', s.toFixed(4))

    this.model.traverse(n => {
      if (n.isMesh) {
        n.castShadow = false
        n.receiveShadow = false

        // This model is richly textured and almost entirely emissive, so it needs
        // very little help: a mild envMap for sheen and a low emissive so the
        // cockpit/engines glow and bloom subtly WITHOUT washing the whole hull
        // white (boosting emissive here turns the ship into a blooming blob).
        if (n.material) {
          n.material.envMap = getEnvTexture()
          n.material.envMapIntensity = 0.4
          n.material.metalness = Math.min(n.material.metalness, 0.6)
          n.material.emissiveIntensity = 0.12
          n.material.needsUpdate = true
        }
      }
    })
    this.group.add(this.model)

    // Rear thruster glow — additive sprites that flare with thrust/speed (and
    // blaze in turbo). The model's own emissive engines are the base; these are
    // the dynamic exhaust that reacts to movement.
    this.thrusters = THRUSTER_OFFSETS.map(off => {
      const t = makeGlowSprite(0x86E4FF, 2.2, 0)
      t.position.copy(off)
      this.group.add(t)
      return t
    })

    // Camera-side fill light. HELIOS is the only scene light and it sits AHEAD of
    // the ship when flying starward, so the chase cam (which views the rear) would
    // otherwise see an unlit side. This dim cool light rides near the chase camera
    // in ship-local space so it always lifts exactly the surfaces the camera sees.
    // Low intensity — the model is self-lit, so this is a gentle fill, not the
    // primary light. Tight falloff keeps it off the planets.
    this.fillLight = new THREE.PointLight(0xB0C4FF, 35, 90, 1.5)
    this.fillLight.position.set(0, 8, 34)
    this.group.add(this.fillLight)

    this.ready = true
    console.log('[Ship] loaded')
  }

  update(delta) {
    if (!this.ready) return

    // Arcade flight — zero feedback loops. Earlier schemes derived the thrust
    // basis from the ship frame or the chase camera; both couple thrust →
    // orientation → camera → thrust and settle into tail-chasing circles.
    // Here orientation changes ONLY from explicit input: A/D yaw the nose,
    // W/S thrust along it, Space/Shift lift/drop. The chase camera hangs off
    // the (yaw-only) group quaternion, so W is always "into the screen" and
    // the loop never closes.
    const yawInput   = (InputSystem.isPressed('KeyD') || InputSystem.isPressed('ArrowRight') ? 1 : 0)
                     - (InputSystem.isPressed('KeyA') || InputSystem.isPressed('ArrowLeft')  ? 1 : 0)
    const thrustFwd  = (InputSystem.isPressed('KeyW') || InputSystem.isPressed('ArrowUp')    ? 1 : 0)
                     - (InputSystem.isPressed('KeyS') || InputSystem.isPressed('ArrowDown')  ? 1 : 0)
    const thrustVert = (InputSystem.isPressed('Space') ? 1 : 0)
                     - (InputSystem.isPressed('ControlLeft') || InputSystem.isPressed('ControlRight') ? 1 : 0)

    // Turbo: hold Shift while thrusting forward → big speed + accel boost.
    const turbo = (InputSystem.isPressed('ShiftLeft') || InputSystem.isPressed('ShiftRight')) && thrustFwd > 0
    state.turbo = turbo
    if (turbo && !this._wasTurbo) AudioSystem.play('boost')
    this._wasTurbo = turbo
    const maxSpeed    = turbo ? MAX_SPEED   * TURBO_SPEED_MULT  : MAX_SPEED
    const thrustForce = turbo ? THRUST_FORCE * TURBO_THRUST_MULT : THRUST_FORCE

    // Re-sync the logical heading only after external control (autopilot) moved
    // the ship; otherwise integrate it directly so A/D turns at full TURN_RATE.
    if (!this._headingSynced) {
      this._forward.set(0, 0, -1).applyQuaternion(this.group.quaternion)
      this._heading = Math.atan2(-this._forward.x, -this._forward.z)
      this._headingSynced = true
    }
    this._heading -= yawInput * TURN_RATE * delta   // D → clockwise (right) seen from above
    const heading = this._heading

    // Thrust along the new nose direction (horizontal) + world vertical.
    // Normalized so diagonal input doesn't exceed 1g.
    this._forward.set(-Math.sin(heading), 0, -Math.cos(heading))
    this._thrustWorld.set(0, 0, 0)
      .addScaledVector(this._forward, thrustFwd)
      .addScaledVector(WORLD_UP, thrustVert)
    if (this._thrustWorld.lengthSq() > 1) this._thrustWorld.normalize()

    state.shipVelocity.addScaledVector(this._thrustWorld, thrustForce * delta)
    state.shipVelocity.multiplyScalar(DRAG)
    state.shipVelocity.clampLength(0, maxSpeed)

    this.group.position.addScaledVector(state.shipVelocity, delta)
    state.shipPosition.copy(this.group.position)

    // Group gets the pure yaw orientation (slerped, so pitch/roll left over from
    // autopilot banking levels out instead of snapping). Camera stays level.
    this._headingEuler.set(0, heading, 0)
    this._headingQuat.setFromEuler(this._headingEuler)
    this.group.quaternion.slerp(this._headingQuat, 0.25)

    // Visual bank into turns + pitch from vertical motion — applied to the holder
    // (this.model) only, so the chase camera never rolls. The base yaw lives on an
    // inner node, so these axes are clean: +Z rolls about the forward axis, +X
    // pitches the nose. Bank into the turn (right turn → right wing dips → -Z roll);
    // nose rises when climbing (+pitch).
    this._smoothYaw = THREE.MathUtils.lerp(this._smoothYaw, yawInput, 0.08)
    const pitchTarget = THREE.MathUtils.clamp(state.shipVelocity.y * 0.018, -PITCH_MAX, PITCH_MAX)
    this.model.rotation.z = -this._smoothYaw * BANK_MAX
    this.model.rotation.x = THREE.MathUtils.lerp(this.model.rotation.x, pitchTarget, 0.1)

    // Thruster flare — small nozzle glows that swell with forward thrust + speed,
    // a bit more in turbo. Kept compact so they read as exhaust, not a halo.
    const speedFrac = Math.min(1, state.shipVelocity.length() / MAX_SPEED)
    const drive = Math.min(1, Math.max(0, thrustFwd) * 0.6 + speedFrac * 0.4) + (turbo ? 0.45 : 0)
    for (const t of this.thrusters) {
      t.material.opacity = THREE.MathUtils.lerp(t.material.opacity, Math.min(0.85, drive * 0.7), 0.2)
      const sc = 0.8 + drive * 1.5
      t.scale.setScalar(THREE.MathUtils.lerp(t.scale.x, sc, 0.2))
    }
  }

  // Reset to a start pose — "ground zero" for the R key. Clears velocity, heading,
  // and visual bank/pitch so the ship doesn't drift after the reset. Progress
  // (scans, objectives) is untouched — that lives in QuestLog / state, not here.
  resetTo(pos) {
    this.group.position.copy(pos)
    this.group.quaternion.identity()
    this._heading = 0
    this._headingSynced = false
    this._smoothYaw = 0
    if (this.model) this.model.rotation.set(0, 0, 0)
    state.shipVelocity.set(0, 0, 0)
    state.shipPosition.copy(pos)
  }

  // Smoothly orient toward the travel direction (state.shipVelocity). A per-frame
  // group.lookAt() snaps the heading to instantaneous velocity — any noise jumps
  // the orientation, and the chase camera (which rides this quaternion) jitters.
  // Slerping toward the target heading damps that into a smooth bank. Threshold
  // avoids spinning when nearly stopped. _orientHelper is a parent-less Object3D,
  // so its lookAt() reproduces the exact facing group.lookAt() would produce —
  // just eased into. Also used by AutopilotSystem to bank along its flight path.
  faceVelocity(slerpFactor = 0.1) {
    if (state.shipVelocity.lengthSq() <= 0.04) return
    this._facePoint.copy(this.group.position).add(state.shipVelocity)
    this.faceTowards(this._facePoint, slerpFactor)
  }

  // Slerp the ship's NOSE (group -Z) toward a world point. Object3D.lookAt on a
  // non-camera aims +Z at the target — and the nose is -Z — so naively looking at
  // the destination points the tail at it (the ship flies backwards). We aim the
  // helper at the MIRROR point (2*pos - target) instead: that puts +Z away from the
  // target, so the nose (-Z) ends up facing it. Used by the autopilot to keep the
  // ship pointed where it's going. Sets _headingSynced so manual control re-syncs.
  faceTowards(point, slerpFactor = 0.15) {
    this._headingSynced = false
    this._orientHelper.position.copy(this.group.position)
    this._tmpTarget.copy(this.group.position).multiplyScalar(2).sub(point)
    this._orientHelper.lookAt(this._tmpTarget)
    this.group.quaternion.slerp(this._orientHelper.quaternion, slerpFactor)
  }
}
