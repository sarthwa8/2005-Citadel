# THE HELIOS SYSTEM — Build Context for Claude Code

## What We Are Building

An interactive 3D space exploration portfolio. The visitor pilots a spacecraft
(MERIDIAN-SXVS) through a procedurally-lit solar system. Each celestial body
is a portfolio section. Approach a body and press E to scan it — a holographic
info panel appears with content. Moons orbit parent planets and reveal
sub-details (e.g. the Skills planet has 4 moons for Languages, AI/ML, Web, Tools).

Core loop: Fly → Approach → Press E → Read → Explore moons → Move on.

---

## Tech Stack

```json
{
  "dependencies": {
    "three": "^0.167.0",
    "gsap": "^3.12.5",
    "howler": "^2.2.4"
  },
  "devDependencies": {
    "vite": "^5.3.0"
  }
}
```

Three.js addons used (import from `three/addons/`):
- `loaders/GLTFLoader.js`
- `loaders/DRACOLoader.js`
- `postprocessing/EffectComposer.js`
- `postprocessing/RenderPass.js`
- `postprocessing/UnrealBloomPass.js`
- `postprocessing/OutputPass.js`
- `renderers/CSS2DRenderer.js` + `CSS2DObject`

---

## Assets — ACQUIRED ✓

All assets are sourced. Do not re-download anything.

**Models (in `/public/models/`):**
- `star_sparrow_modular_spaceship.glb` — ship (MERIDIAN-SXVS)
- `space_station.glb` — NOVARA station
- `asteroid_low_poly.glb` — instanced ×200 for belt

**Textures (in `/public/textures/`):** 5 packs from Polyhaven, one per planet.
See Asset Manifest below for exact filenames.

---

## Asset Manifest

Everything that must exist in `/public` before building:

```
/public
  /models
    star_sparrow_modular_spaceship.glb    Ship (MERIDIAN-SXVS)
    space_station.glb                     NOVARA station
    asteroid_low_poly.glb                 Single asteroid mesh (instanced ×200)

  /textures
    -- GENESIS (blue/oceanic planet) --
    aerial_beach_01_diff_1k.jpg
    aerial_beach_01_nor_gl_1k.png
    aerial_beach_01_disp_1k.png
    aerial_beach_01_rough_1k.jpg

    -- SYNTHEX (purple gas giant — no displacement) --
    mossy_rock_diff_1k.jpg
    mossy_rock_nor_gl_1k.png
    mossy_rock_rough_1k.png

    -- EXPEDITION (amber/volcanic planet) --
    red_laterite_soil_stones_diff_1k.jpg
    red_laterite_soil_stones_nor_gl_1k.png
    red_laterite_soil_stones_disp_1k.png
    red_laterite_soil_stones_rough_1k.png

    -- CODEX (teal planet) --
    rock_embedded_concrete_wall_diff_1k.jpg
    rock_embedded_concrete_wall_nor_gl_1k.png
    rock_embedded_concrete_wall_disp_1k.png
    rock_embedded_concrete_wall_rough_1k.png

    -- ACADEMY (green planet) --
    rocks_ground_04_diff_1k.jpg
    rocks_ground_04_nor_gl_1k.png
    rocks_ground_04_disp_1k.png
    rocks_ground_04_rough_1k.jpg

  /audio
    ambient_space.mp3     Continuous deep drone loop
    proximity_tone.mp3    Short tone played on planet proximity (use for all planets)
    scan_fire.mp3         Scan pulse activation SFX
    scan_complete.mp3     Info panel open SFX
    moon_unlock.mp3       Short chime when a moon unlocks
    thruster.mp3          Quiet continuous hiss during thrust
    comet_detected.mp3    One-shot eerie tone on comet appearance

  /draco
    draco_decoder.wasm    Copy from node_modules/three/examples/jsm/libs/draco/
    draco_decoder.js
    draco_wasm_wrapper.js
```

---

## Complete File Structure

```
/
├── index.html
├── package.json
├── vite.config.js
├── /src
│   ├── main.js                   Entry point. Runs loading, then init, then game loop.
│   ├── state.js                  Shared mutable state object all systems read/write.
│   │
│   ├── /core
│   │   ├── scene.js              Creates THREE.Scene, WebGLRenderer, CSS2DRenderer, EffectComposer.
│   │   ├── camera.js             Manages 3 camera modes + GSAP transitions between them.
│   │   └── AssetLoader.js        Loads all GLTFs and textures, returns a resolved asset map.
│   │
│   ├── /entities
│   │   ├── Star.js               HELIOS — animated surface shader + corona particles + PointLight.
│   │   ├── Planet.js             Reusable class for all 5 planets. Takes config with texture paths.
│   │   ├── Moon.js               Small sphere orbiting a parent. Has locked/unlocked state.
│   │   ├── Ship.js               GLTF ship + engine glow PointLights + scan ring TorusGeometry.
│   │   ├── Station.js            GLTF station + running lights + slow Y-axis rotation.
│   │   ├── AsteroidBelt.js       InstancedMesh of asteroid.glb mesh, distributed on torus.
│   │   └── Comet.js              Points-based particle trail following a bezier path.
│   │
│   ├── /systems
│   │   ├── OrbitalMechanics.js   Updates planet/moon positions each frame via angle += speed * delta.
│   │   ├── ProximitySystem.js    Checks ship distance to all bodies each frame. Updates state.
│   │   ├── ScanSystem.js         Handles E press, scan pulse mesh, info panel trigger, moon unlock.
│   │   ├── InputSystem.js        Keyboard and mouse state — no logic, just raw input state.
│   │   ├── AudioSystem.js        Howler.js init + proximity volume scaling.
│   │   └── AutopilotSystem.js    GSAP-tweened ship movement to a target body.
│   │
│   ├── /shaders
│   │   ├── atmosphere.vert.glsl
│   │   ├── atmosphere.frag.glsl
│   │   ├── star.vert.glsl
│   │   └── star.frag.glsl
│   │
│   ├── /ui
│   │   ├── HUD.js                Updates DOM elements (coords, proximity label, mode indicator).
│   │   ├── InfoPanel.js          Builds and shows/hides the scan result HTML panel.
│   │   ├── DiscoveryLog.js       Append-only log of scanned bodies with GSAP slide-in.
│   │   ├── MiniMap.js            Draws a 2D canvas minimap updated every 500ms.
│   │   └── LoadingScreen.js      Shows/hides the loading overlay with progress updates.
│   │
│   └── /data
│       └── bodies.js             All portfolio content. Every personal detail is a placeholder.
│
├── /styles
│   └── main.css                  HUD layout, info panel, loading screen, all UI styles.
│
└── /public                       (see Asset Manifest above)
```

---

## Shared State (`state.js`)

All systems communicate through this object. No direct system-to-system calls.

```js
import * as THREE from 'three'

export const state = {
  // Camera
  cameraMode: 'overview',       // 'overview' | 'flight' | 'scan'
  transitioning: false,          // true during GSAP camera tween

  // Ship
  shipVelocity: new THREE.Vector3(),
  shipPosition: new THREE.Vector3(),
  thrustInput: new THREE.Vector3(), // set by InputSystem each frame

  // Bodies
  nearestBody: null,             // Body instance (Planet, Moon, Star, Station)
  nearestBodyDistance: Infinity,
  inScanRange: false,            // true when nearestBodyDistance < body.scanRadius

  // Scan
  scanTarget: null,              // Body being actively scanned
  scanActive: false,             // true while pulse is expanding
  panelOpen: false,              // true while info panel is visible

  // Discovery
  discoveredBodies: new Set(),   // Set of body names already scanned
  discoveryOrder: [],            // Array for the discovery log

  // Autopilot
  autopilotActive: false,
  autopilotTarget: null,

  // Comet
  cometVisible: false,
  cometScanned: false,
}
```

---

## Initialization Sequence (`main.js`)

```
1. Show loading screen
2. AssetLoader.loadAll(ASSET_MANIFEST) → await, update progress bar during load
3. scene.init()           — creates renderer, scene, lights, composers
4. camera.init()          — creates PerspectiveCamera, sets overview position
5. Instantiate all entities (Star, Planets, Ship, etc.) passing loaded assets
6. Add all entity meshes to scene
7. InputSystem.init()     — attach event listeners
8. AudioSystem.init()     — init Howler sounds
9. HUD.init()             — grab DOM references
10. Hide loading screen
11. Start requestAnimationFrame loop

Game loop each frame:
  delta = clock.getDelta()
  InputSystem.update()
  if (!state.transitioning && state.cameraMode === 'flight') Ship.update(delta)
  OrbitalMechanics.update(delta)
  ProximitySystem.update()
  ScanSystem.update(delta)
  AutopilotSystem.update(delta)
  AudioSystem.update()
  HUD.update()
  MiniMap.update()          (throttled — only runs every 500ms)
  composer.render()
  css2DRenderer.render(scene, camera)
```

---

## Renderer & Post-Processing (`scene.js`)

```js
// WebGLRenderer
renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0

// CSS2DRenderer (for planet labels)
css2DRenderer = new CSS2DRenderer()
css2DRenderer.setSize(window.innerWidth, window.innerHeight)
css2DRenderer.domElement.style.position = 'absolute'
css2DRenderer.domElement.style.top = '0'
css2DRenderer.domElement.style.pointerEvents = 'none'
document.body.appendChild(css2DRenderer.domElement)

// EffectComposer
composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,    // strength
  0.5,    // radius
  0.25    // threshold — tune so planets don't bloom, only emissive elements do
))
composer.addPass(new OutputPass())

// Lights
scene.add(new THREE.AmbientLight(0x0a0a2a, 0.8))   // very dark blue ambient
// HELIOS PointLight is created inside Star.js and added to scene there
```

---

## HELIOS Star (`Star.js`)

The star uses a custom animated ShaderMaterial so the surface appears to churn.

**star.vert.glsl**
```glsl
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

**star.frag.glsl**
```glsl
uniform float time;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += noise(p) * a; p *= 2.1; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = vUv + vec2(time * 0.018, time * 0.009);
  float n = fbm(uv * 3.5);
  vec3 cA = vec3(0.91, 0.38, 0.02);  // deep orange
  vec3 cB = vec3(0.98, 0.93, 0.42);  // bright yellow
  gl_FragColor = vec4(mix(cA, cB, n), 1.0);
}
```

**Star.js setup:**
```js
// Core star mesh
const geo = new THREE.SphereGeometry(22, 64, 64)
const mat = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 } },
  vertexShader: starVert,
  fragmentShader: starFrag,
})
this.mesh = new THREE.Mesh(geo, mat)

// Inner glow (larger sphere, additive blend)
const glowGeo = new THREE.SphereGeometry(30, 32, 32)
const glowMat = new THREE.MeshBasicMaterial({
  color: 0xFFA040, transparent: true, opacity: 0.15,
  depthWrite: false, blending: THREE.AdditiveBlending,
  side: THREE.BackSide
})
this.innerGlow = new THREE.Mesh(glowGeo, glowMat)

// PointLight — primary scene light
this.light = new THREE.PointLight(0xFFA050, 3.0, 2000, 1.2)

// update() called each frame:
this.mat.uniforms.time.value = elapsed
```

UnrealBloom will pick up the emissive surface and create the star halo automatically.
No corona sprites needed if bloom threshold is set correctly (0.25).

---

## Planet System (`Planet.js`)

Each planet is a class instance. Config object drives all variation.

**Config shape:**
```js
{
  name: 'GENESIS',
  radius: 6,
  orbitRadius: 90,
  orbitSpeed: 0.00025,       // radians per millisecond
  orbitAngle: 0,             // starting angle in radians
  orbitInclination: 0,       // Y-axis tilt of orbit plane (radians)
  axialTilt: 0.26,           // planet self-tilt (radians)
  rotationSpeed: 0.0008,     // self-rotation speed
  isGasGiant: false,         // if true, skip displacement map, lower poly count
  colorMap: '/textures/genesis_color.jpg',
  normalMap: '/textures/genesis_normal.jpg',
  displacementMap: '/textures/genesis_displacement.jpg',
  displacementScale: 0.25,
  normalScale: new THREE.Vector2(1, 1),
  atmosphereColor: new THREE.Color(0x4A90D9),
  atmosphereIntensity: 0.9,
  scanRadius: 35,            // ship must be within this distance to trigger scan
  labelColor: '#4A90D9',
  moons: []                  // array of Moon config objects
}
```

**Sphere geometry:**
- Rocky planets: `SphereGeometry(radius, 256, 256)` — high segments needed for displacement
- Gas giants: `SphereGeometry(radius, 64, 64)` — smooth enough, no displacement

**Material:**
```js
const mat = new THREE.MeshStandardMaterial({
  map: textureLoader.load(config.colorMap),
  normalMap: textureLoader.load(config.normalMap),
  normalScale: config.normalScale,
  roughnessMap: config.roughnessMap ? textureLoader.load(config.roughnessMap) : null,
  roughness: 0.85,
  metalness: 0.0,
})
if (!config.isGasGiant && config.displacementMap) {
  mat.displacementMap = textureLoader.load(config.displacementMap)
  mat.displacementScale = config.displacementScale
}
```

**Atmosphere shader — atmosphere.vert.glsl:**
```glsl
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
```

**atmosphere.frag.glsl:**
```glsl
uniform vec3 atmosphereColor;
uniform float atmosphereIntensity;
uniform float emissiveBoost;   // tweened up when planet is in scan range
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
  rim = pow(rim, 2.2);
  float alpha = rim * atmosphereIntensity;
  gl_FragColor = vec4(atmosphereColor + vec3(emissiveBoost), alpha);
}
```

**Atmosphere mesh:**
```js
const atmGeo = new THREE.SphereGeometry(config.radius * 1.12, 64, 64)
const atmMat = new THREE.ShaderMaterial({
  uniforms: {
    atmosphereColor: { value: config.atmosphereColor },
    atmosphereIntensity: { value: config.atmosphereIntensity },
    emissiveBoost: { value: 0.0 },
  },
  vertexShader: atmosphereVert,
  fragmentShader: atmosphereFrag,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.FrontSide,
})
this.atmosphereMesh = new THREE.Mesh(atmGeo, atmMat)
```

**Grouping:**
```js
this.orbitGroup = new THREE.Group()        // rotates to orbit HELIOS
this.planetGroup = new THREE.Group()       // holds planet + atmosphere + moons
this.planetGroup.rotation.z = config.axialTilt
this.orbitGroup.add(this.planetGroup)
this.planetGroup.position.x = config.orbitRadius
scene.add(this.orbitGroup)
```

**CSS2DObject label:**
```js
const div = document.createElement('div')
div.className = 'planet-label'
div.textContent = config.name
div.style.color = config.labelColor
const label = new CSS2DObject(div)
label.position.set(0, config.radius + 4, 0)
this.planetGroup.add(label)
```

**On scan range enter:** GSAP tween `atmosphereMesh.material.uniforms.emissiveBoost.value` from 0 to 0.4 over 0.5s.
**On scan range exit:** Tween back to 0.

---

## SYNTHEX Ring

SYNTHEX is the only planet with a visible ring.

```js
const ringGeo = new THREE.RingGeometry(
  config.radius * 1.4,   // inner radius
  config.radius * 2.2,   // outer radius
  128
)
// RingGeometry UV fix — required for correct texture mapping
const pos = ringGeo.attributes.position
const uv = ringGeo.attributes.uv
const v3 = new THREE.Vector3()
for (let i = 0; i < pos.count; i++) {
  v3.fromBufferAttribute(pos, i)
  uv.setXY(i, v3.length() < config.radius * 1.8 ? 0 : 1, 1)
}

const ringMat = new THREE.MeshBasicMaterial({
  color: 0x9B59B6,
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  depthWrite: false,
})
const ring = new THREE.Mesh(ringGeo, ringMat)
ring.rotation.x = Math.PI / 2
this.planetGroup.add(ring)
```

---

## Moon System (`Moon.js`)

```js
// Config shape
{
  name: 'LANG',
  parentPlanet: planetInstance,
  orbitRadius: 14,
  orbitSpeed: 0.001,
  radius: 1.8,
  color: 0xC39BD3,
  locked: true,           // starts locked until parent is scanned
  content: { ... }        // populated from bodies.js
}

// Locked state rendering
if (this.locked) {
  this.mesh.material.opacity = 0.35
  this.mesh.material.transparent = true
  this.lockLabel.element.textContent = '⬡ LOCKED'
} else {
  this.mesh.material.opacity = 1.0
  this.lockLabel.element.textContent = this.config.name
}

// unlock() — called by ScanSystem when parent is first scanned
unlock() {
  this.locked = false
  gsap.to(this.mesh.material, { opacity: 1.0, duration: 0.8 })
  // Brief particle burst — 30 Points, color matching moon, velocity outward, fade over 0.6s
  this.spawnUnlockParticles()
}
```

---

## Ship (`Ship.js`)

```js
constructor(gltf) {
  this.group = new THREE.Group()

  // Normalize model
  this.model = gltf.scene.clone()
  this.model.scale.setScalar(SHIP_SCALE)      // tune after loading, ~0.8–1.5
  this.model.rotation.y = Math.PI             // face forward (-Z)
  this.group.add(this.model)

  // Ensure PBR lighting works on model materials
  this.model.traverse(n => {
    if (n.isMesh) {
      n.castShadow = false
      n.receiveShadow = false
    }
  })

  // Engine glows (position offsets tuned by eye after model loads)
  this.engineL = this.makeEngineGlow()
  this.engineR = this.makeEngineGlow()
  this.engineL.position.set(-ENGINE_X, ENGINE_Y, ENGINE_Z)
  this.engineR.position.set( ENGINE_X, ENGINE_Y, ENGINE_Z)
  this.group.add(this.engineL, this.engineR)

  // Scan ring (hidden until scan triggered)
  const ringGeo = new THREE.TorusGeometry(30, 0.4, 8, 64)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x48C9B0, transparent: true, opacity: 0, depthWrite: false
  })
  this.scanRing = new THREE.Mesh(ringGeo, ringMat)
  this.scanRing.rotation.x = Math.PI / 2
  this.group.add(this.scanRing)
}

makeEngineGlow() {
  const g = new THREE.Group()
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 16),
    new THREE.MeshBasicMaterial({ color: 0x48C9B0, transparent: true, opacity: 0.9 })
  )
  const light = new THREE.PointLight(0x48C9B0, 0.8, 20)
  g.add(disc, light)
  return g
}

update(delta) {
  const input = InputSystem.getThrust()   // THREE.Vector3 from WASD
  const drag = 0.96

  state.shipVelocity.addScaledVector(input, THRUST_FORCE * delta)
  state.shipVelocity.multiplyScalar(drag)
  state.shipVelocity.clampLength(0, MAX_SPEED)

  this.group.position.addScaledVector(state.shipVelocity, delta)
  state.shipPosition.copy(this.group.position)

  // Engine glow intensity based on thrust
  const thrustMag = input.length()
  const targetOpacity = 0.3 + thrustMag * 0.7
  this.engineL.children[0].material.opacity = THREE.MathUtils.lerp(
    this.engineL.children[0].material.opacity, targetOpacity, 0.15
  )

  // Orient ship toward velocity if moving
  if (state.shipVelocity.lengthSq() > 0.01) {
    const target = this.group.position.clone().add(state.shipVelocity)
    this.group.lookAt(target)
  }
}
```

**Engine offset constants** — these WILL need manual tuning after you load your specific model. Add a debug mode (press `~`) that logs engine group world positions so you can see where to put them.

---

## NOVARA Station (`Station.js`)

```js
constructor(gltf) {
  // Model file: space_station.glb
  this.group = new THREE.Group()

  this.model = gltf.scene.clone()
  this.model.scale.setScalar(STATION_SCALE)
  this.group.add(this.model)

  // Running lights (positions hardcoded after eyeballing loaded model)
  this.lights = []
  const lightPositions = [
    new THREE.Vector3(-8, 3, 0),
    new THREE.Vector3( 8, 3, 0),
    new THREE.Vector3( 0, 3, 8),
    new THREE.Vector3( 0, 3, -8),
    new THREE.Vector3(-8, -3, 0),
    new THREE.Vector3( 8, -3, 0),
  ]
  lightPositions.forEach((pos, i) => {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x48C9B0 : 0xF5C840 })
    )
    light.position.copy(pos)
    this.group.add(light)
    this.lights.push(light)
  })
}

update(elapsed) {
  this.group.rotation.y = elapsed * 0.08   // slow rotation

  // Pulse running lights
  this.lights.forEach((l, i) => {
    l.material.opacity = 0.5 + 0.5 * Math.sin(elapsed * 1.5 + i * 1.2)
    l.material.transparent = true
  })
}
```

---

## Asteroid Belt (`AsteroidBelt.js`)

```js
constructor(gltf) {
  // Extract single mesh from loaded GLTF
  let geo, mat
  gltf.scene.traverse(n => {
    if (n.isMesh && !geo) {
      geo = n.geometry.clone()
      mat = n.material.clone()
    }
  })

  // If multi-mesh, merge: import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

  mat.roughness = 0.92
  mat.metalness = 0.05

  this.belt = new THREE.InstancedMesh(geo, mat, BELT_COUNT)       // BELT_COUNT = 200
  // Model file: asteroid_low_poly.glb
  this.gold = new THREE.InstancedMesh(geo, goldMat, 4)            // achievement asteroids

  // Distribute along a torus (ring radius=200, tube radius=8)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < BELT_COUNT; i++) {
    const angle = (i / BELT_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
    const r = 200 + (Math.random() - 0.5) * 16
    const y = (Math.random() - 0.5) * 8
    dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r)
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    const scale = 0.3 + Math.random() * 2.2
    dummy.scale.setScalar(scale)
    dummy.updateMatrix()
    this.belt.setMatrixAt(i, dummy.matrix)
  }
  this.belt.instanceMatrix.needsUpdate = true
}
```

**Belt turbulence:** In `ProximitySystem.update()`, check if ship is at radius 192–208.
If so, add a small `camera.position` offset each frame:
```js
const shake = (Math.random() - 0.5) * 0.08
camera.position.x += shake
camera.position.y += shake * 0.5
```

---

## Orbital Mechanics (`OrbitalMechanics.js`)

```js
update(delta) {
  planets.forEach(planet => {
    planet.config.orbitAngle += planet.config.orbitSpeed * delta

    // Planet group orbits HELIOS
    planet.orbitGroup.rotation.y = planet.config.orbitAngle

    // Apply orbital inclination
    planet.orbitGroup.rotation.x = planet.config.orbitInclination

    // Planet self-rotation
    planet.mesh.rotation.y += planet.config.rotationSpeed * delta

    // Moon orbits
    planet.moons.forEach(moon => {
      moon.orbitAngle += moon.config.orbitSpeed * delta
      moon.group.position.x = Math.cos(moon.orbitAngle) * moon.config.orbitRadius
      moon.group.position.z = Math.sin(moon.orbitAngle) * moon.config.orbitRadius
    })
  })

  // NOVARA orbit (same ring as CODEX but offset)
  station.orbitGroup.rotation.y += STATION_ORBIT_SPEED * delta
}
```

---

## Camera System (`camera.js`)

```js
// Mode 1 — OVERVIEW
// Position: (0, 500, 200), looking at origin
// Interaction: mouse drag to orbit (use pointer events, compute azimuth/elevation)
// Click on a planet label → triggers autopilot + transitions to FLIGHT mode

// Mode 2 — FLIGHT
// Position: ship.group.position + offset (-Z direction from ship, elevated)
// CHASE_OFFSET = new THREE.Vector3(0, 8, 30)
// camera.position.lerp(desiredPos, 0.08)  — smooth follow
// camera.lookAt(ship.group.position)

// Mode 3 — SCAN
// Triggered: ScanSystem fires, state.scanTarget is set
// Camera tweens to: targetPlanet.worldPosition + (direction_away_from_helios * radius * 2.5)
// Slowly orbits the planet while panel is open
// camera.lookAt(target planet position) each frame during orbit

// Transition function
function transitionTo(newMode, targetBody = null) {
  if (state.transitioning) return
  state.transitioning = true
  state.cameraMode = newMode

  const positions = {
    overview: { pos: new THREE.Vector3(0, 500, 200), target: new THREE.Vector3(0,0,0) },
    flight: computeFlightPosition(),
    scan: computeScanPosition(targetBody),
  }

  gsap.to(camera.position, {
    ...positions[newMode].pos,
    duration: 1.1,
    ease: 'power2.inOut',
    onComplete: () => { state.transitioning = false }
  })
}
```

**Tab key:** Toggle between overview and flight modes.
**Autopilot:** When player clicks a body in overview, call `AutopilotSystem.flyTo(body)` then transition to flight mode.

---

## Proximity & Scan System

**ProximitySystem.update():**
```js
let nearest = null
let nearestDist = Infinity

allBodies.forEach(body => {
  const dist = state.shipPosition.distanceTo(body.worldPosition())
  if (dist < nearestDist) { nearest = body; nearestDist = dist }
})

state.nearestBody = nearest
state.nearestBodyDistance = nearestDist
state.inScanRange = nearestDist < (nearest?.config.scanRadius ?? 35)

// Update atmosphere emissive boost on nearest body
if (state.inScanRange && nearest) {
  nearest.onProximityEnter?.()   // triggers GSAP atmosphere glow tween
} else if (prevNearest !== nearest) {
  prevNearest?.onProximityExit?.()
}
```

**ScanSystem — on E keypress:**
```js
function triggerScan() {
  if (!state.inScanRange || state.scanActive || state.panelOpen) return
  if (state.cameraMode !== 'flight') return

  state.scanActive = true
  state.scanTarget = state.nearestBody

  // 1. Animate scan ring on ship
  gsap.to(ship.scanRing.material, { opacity: 0.7, duration: 0.1 })
  gsap.to(ship.scanRing.scale, { x: 3, y: 3, z: 3, duration: 0.6,
    onComplete: () => {
      gsap.to(ship.scanRing.material, { opacity: 0, duration: 0.2 })
      ship.scanRing.scale.setScalar(1)
    }
  })

  // 2. Scan pulse sphere expands from ship toward body
  spawnScanPulse(ship.group.position, state.scanTarget)

  // 3. On pulse arrival (~0.6s later), show info panel + transition camera
  setTimeout(() => {
    state.scanActive = false
    state.panelOpen = true

    if (!state.discoveredBodies.has(state.scanTarget.config.name)) {
      state.discoveredBodies.add(state.scanTarget.config.name)
      state.discoveryOrder.push(state.scanTarget.config.name)
      DiscoveryLog.addEntry(state.scanTarget.config.name)

      // Unlock moons if this is a planet
      state.scanTarget.moons?.forEach(m => m.unlock())
    }

    InfoPanel.show(state.scanTarget.config)
    camera.transitionTo('scan', state.scanTarget)
    AudioSystem.play('scan_complete')
  }, 650)
}
```

**Scan pulse mesh:**
```js
function spawnScanPulse(origin, target) {
  const pulseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x48C9B0, transparent: true, opacity: 0.55,
      depthWrite: false, side: THREE.BackSide
    })
  )
  pulseMesh.position.copy(origin)
  scene.add(pulseMesh)

  const dist = origin.distanceTo(target.worldPosition())
  gsap.to(pulseMesh.scale, {
    x: dist, y: dist, z: dist,
    duration: 0.65,
    ease: 'power1.out',
    onUpdate: function() {
      pulseMesh.material.opacity = 0.55 * (1 - this.progress())
    },
    onComplete: () => scene.remove(pulseMesh)
  })
}
```

**Close panel:** E or Escape → `InfoPanel.hide()`, `camera.transitionTo('flight')`, `state.panelOpen = false`.

---

## HUD (`/styles/main.css` + `HUD.js`)

**HTML structure in index.html:**
```html
<div id="hud">
  <div id="hud-top-left">
    <canvas id="minimap"></canvas>
  </div>

  <div id="hud-top-right">
    <div id="discovery-log">
      <div class="log-title">DISCOVERY LOG</div>
      <div id="log-entries"></div>
    </div>
  </div>

  <div id="hud-bottom-center">
    <span id="hud-name">MERIDIAN-SXVS</span>
    <span class="hud-sep">|</span>
    <span id="hud-coords">0.0 · 0.0 · 0.0</span>
    <span class="hud-sep">|</span>
    <span id="hud-proximity">PROXIMITY: —</span>
  </div>

  <div id="hud-bottom-right">
    <div id="controls-hint"></div>
  </div>

  <div id="camera-mode-indicator"></div>
</div>

<div id="info-panel" class="hidden">
  <div id="panel-header">
    <span id="panel-designation"></span>
    <span id="panel-badge"></span>
  </div>
  <div id="panel-body"></div>
  <div id="panel-footer">SCAN COMPLETE · <span id="panel-timestamp"></span></div>
  <button id="panel-close">[ CLOSE ]</button>
</div>

<div id="loading-screen">
  <div id="loading-name">[YOUR_NAME]</div>
  <div id="loading-tagline">INITIALIZING NAVIGATION SYSTEMS</div>
  <div id="loading-track"><div id="loading-fill"></div></div>
  <div id="loading-status">LOADING ASSETS</div>
</div>
```

**Key CSS rules:**
```css
body { margin: 0; background: #000; overflow: hidden; font-family: 'Courier New', monospace; }
canvas { display: block; }

#hud { position: fixed; inset: 0; pointer-events: none; color: #1A9888; font-size: 12px; }
#hud-top-left    { position: absolute; top: 16px; left: 16px; }
#hud-top-right   { position: absolute; top: 16px; right: 16px; width: 220px; }
#hud-bottom-center { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                     letter-spacing: 2px; opacity: 0.85; }
#hud-bottom-right  { position: absolute; bottom: 20px; right: 20px; text-align: right; opacity: 0.6; }

#minimap { width: 140px; height: 140px; border: 1px solid rgba(26,152,136,0.4); }

#discovery-log { border: 1px solid rgba(26,152,136,0.3); padding: 8px 12px; min-width: 180px; }
.log-entry { opacity: 0; transform: translateY(-8px); padding: 3px 0; font-size: 11px; }

/* Info panel */
#info-panel {
  position: fixed; top: 50%; right: 40px; transform: translateY(-50%);
  width: 320px; background: rgba(5,8,16,0.92);
  border: 1px solid rgba(26,152,136,0.6); padding: 24px;
  color: #e0f0ee; font-family: 'Courier New', monospace;
  transition: opacity 0.4s, transform 0.4s;
}
#info-panel.hidden { opacity: 0; pointer-events: none; transform: translateY(-50%) translateX(20px); }
#panel-close { pointer-events: all; cursor: pointer; background: none;
               border: 1px solid rgba(26,152,136,0.5); color: #1A9888;
               padding: 6px 12px; margin-top: 16px; font-family: inherit; }

/* Planet labels (CSS2DRenderer) */
.planet-label { font-family: 'Courier New', monospace; font-size: 11px;
                letter-spacing: 2px; padding: 2px 6px; pointer-events: none; }

/* Loading screen */
#loading-screen { position: fixed; inset: 0; background: #060914;
                  display: flex; flex-direction: column; align-items: center;
                  justify-content: center; gap: 16px; z-index: 100; }
#loading-name { font-size: 28px; color: #1A9888; letter-spacing: 6px; }
#loading-track { width: 280px; height: 2px; background: rgba(26,152,136,0.2); }
#loading-fill  { height: 100%; background: #1A9888; width: 0; transition: width 0.3s; }
```

---

## Portfolio Content — bodies.js

**Every personal detail is a placeholder. Fill these in manually.**

```js
export const BODIES = {

  HELIOS: {
    name:    '[YOUR_NAME]',
    tagline: '[YOUR_ONE_LINE_TAGLINE]',   // e.g. "Building intelligent systems at the edge of what's possible"
  },

  GENESIS: {
    heading: 'About',
    bio:     '[BIO_PARAGRAPH]',
    location: '[YOUR_CITY], [YOUR_COUNTRY]',
    status:   '[CURRENT_STATUS]',         // e.g. "Open to opportunities" / "Currently @ X"
    scanRadius: 35,
  },

  SYNTHEX: {
    heading: 'Skills',
    scanRadius: 35,
    moons: [
      {
        name: 'LANG',
        label: 'Languages',
        items: ['[LANG_1]', '[LANG_2]', '[LANG_3]', '[LANG_4]'],
      },
      {
        name: 'AIML',
        label: 'AI / ML',
        items: ['[AIML_1]', '[AIML_2]', '[AIML_3]', '[AIML_4]'],
      },
      {
        name: 'WEB',
        label: 'Web & Backend',
        items: ['[WEB_1]', '[WEB_2]', '[WEB_3]', '[WEB_4]'],
      },
      {
        name: 'TOOLS',
        label: 'Tools & Infra',
        items: ['[TOOL_1]', '[TOOL_2]', '[TOOL_3]', '[TOOL_4]'],
      },
    ],
  },

  EXPEDITION: {
    heading: 'Experience',
    scanRadius: 35,
    moons: [
      {
        name: 'EXP_1',
        label:       '[COMPANY_1]',
        role:        '[ROLE_1]',
        duration:    '[START_DATE_1] – [END_DATE_1]',
        description: '[DESCRIPTION_1]',
      },
      {
        name: 'EXP_2',
        label:       '[COMPANY_2]',
        role:        '[ROLE_2]',
        duration:    '[START_DATE_2] – [END_DATE_2]',
        description: '[DESCRIPTION_2]',
      },
      {
        name: 'EXP_3',
        label:       '[COMPANY_3]',
        role:        '[ROLE_3]',
        duration:    '[START_DATE_3] – [END_DATE_3]',
        description: '[DESCRIPTION_3]',
      },
    ],
  },

  CODEX: {
    heading: 'Projects',
    scanRadius: 40,
    moons: [
      {
        name: 'PROJ_1',
        label:       '[PROJECT_1_NAME]',
        tech:        '[PROJECT_1_TECH_STACK]',
        description: '[PROJECT_1_DESCRIPTION]',
        link:        '[PROJECT_1_LINK]',         // GitHub / live URL
      },
      {
        name: 'PROJ_2',
        label:       '[PROJECT_2_NAME]',
        tech:        '[PROJECT_2_TECH_STACK]',
        description: '[PROJECT_2_DESCRIPTION]',
        link:        '[PROJECT_2_LINK]',
      },
      {
        name: 'PROJ_3',
        label:       '[PROJECT_3_NAME]',
        tech:        '[PROJECT_3_TECH_STACK]',
        description: '[PROJECT_3_DESCRIPTION]',
        link:        '[PROJECT_3_LINK]',
      },
      {
        name: 'PROJ_4',
        label:       '[PROJECT_4_NAME]',
        tech:        '[PROJECT_4_TECH_STACK]',
        description: '[PROJECT_4_DESCRIPTION]',
        link:        '[PROJECT_4_LINK]',
      },
      {
        name: 'PROJ_5',
        label:       '[PROJECT_5_NAME]',
        tech:        '[PROJECT_5_TECH_STACK]',
        description: '[PROJECT_5_DESCRIPTION]',
        link:        '[PROJECT_5_LINK]',
      },
    ],
  },

  ACADEMY: {
    heading: 'Education',
    scanRadius: 35,
    moons: [
      {
        name: 'EDU_1',
        label:   '[INSTITUTION_1]',
        degree:  '[DEGREE_1]',
        field:   '[FIELD_OF_STUDY_1]',
        period:  '[YEAR_FROM_1] – [YEAR_TO_1]',
        detail:  '[EDU_DETAIL_1]',              // GPA, honours, relevant coursework
      },
      {
        name: 'EDU_2',
        label:  '[INSTITUTION_2]',
        degree: '[DEGREE_2]',
        field:  '[FIELD_OF_STUDY_2]',
        period: '[YEAR_FROM_2] – [YEAR_TO_2]',
        detail: '[EDU_DETAIL_2]',
      },
    ],
  },

  NOVARA: {
    heading: 'Contact',
    scanRadius: 35,
    email:    '[YOUR_EMAIL]',
    linkedin: '[LINKEDIN_URL]',
    github:   '[GITHUB_URL]',
    twitter:  '[TWITTER_HANDLE]',     // optional, leave '' if unused
    resume:   '[RESUME_PDF_URL]',
  },

  ASTEROIDS: [
    { label: '[ACHIEVEMENT_1_SHORT]',  detail: '[ACHIEVEMENT_1_FULL_DESCRIPTION]' },
    { label: '[ACHIEVEMENT_2_SHORT]',  detail: '[ACHIEVEMENT_2_FULL_DESCRIPTION]' },
    { label: '[ACHIEVEMENT_3_SHORT]',  detail: '[ACHIEVEMENT_3_FULL_DESCRIPTION]' },
    { label: '[ACHIEVEMENT_4_SHORT]',  detail: '[ACHIEVEMENT_4_FULL_DESCRIPTION]' },
  ],

  COMET: {
    heading: 'Currently Exploring',
    items: ['[CURRENT_TOPIC_1]', '[CURRENT_TOPIC_2]', '[CURRENT_TOPIC_3]', '[CURRENT_TOPIC_4]'],
  },

}
```

---

## Planet Orbital Configs

Starting orbital angles are staggered so planets don't cluster on one side.

```js
export const PLANET_CONFIGS = [
  {
    name: 'GENESIS', bodyKey: 'GENESIS',
    radius: 6, orbitRadius: 90,  orbitSpeed: 0.00025, orbitAngle: 0.9,
    orbitInclination: 0, axialTilt: 0.26, rotationSpeed: 0.0008, isGasGiant: false,
    colorMap:       '/textures/aerial_beach_01_diff_1k.jpg',
    normalMap:      '/textures/aerial_beach_01_nor_gl_1k.png',
    displacementMap:'/textures/aerial_beach_01_disp_1k.png', displacementScale: 0.25,
    roughnessMap:   '/textures/aerial_beach_01_rough_1k.jpg',
    atmosphereColor: new THREE.Color(0x4A90D9), atmosphereIntensity: 0.85,
    labelColor: '#4A90D9', scanRadius: 35,
  },
  {
    name: 'SYNTHEX', bodyKey: 'SYNTHEX',
    radius: 10, orbitRadius: 155, orbitSpeed: 0.00018, orbitAngle: 2.4,
    orbitInclination: 0, axialTilt: 0.45, rotationSpeed: 0.0012, isGasGiant: true,
    hasRing: true,
    colorMap:       '/textures/mossy_rock_diff_1k.jpg',
    normalMap:      '/textures/mossy_rock_nor_gl_1k.png',
    displacementMap: null,
    roughnessMap:   '/textures/mossy_rock_rough_1k.png',
    atmosphereColor: new THREE.Color(0x9B59B6), atmosphereIntensity: 0.75,
    labelColor: '#9B59B6', scanRadius: 40,
  },
  {
    name: 'ACADEMY', bodyKey: 'ACADEMY',
    radius: 6, orbitRadius: 155, orbitSpeed: 0.00018, orbitAngle: 5.1,
    orbitInclination: 0.14, axialTilt: 0.18, rotationSpeed: 0.0007, isGasGiant: false,
    colorMap:       '/textures/rocks_ground_04_diff_1k.jpg',
    normalMap:      '/textures/rocks_ground_04_nor_gl_1k.png',
    displacementMap:'/textures/rocks_ground_04_disp_1k.png', displacementScale: 0.2,
    roughnessMap:   '/textures/rocks_ground_04_rough_1k.jpg',
    atmosphereColor: new THREE.Color(0x27AE60), atmosphereIntensity: 0.8,
    labelColor: '#27AE60', scanRadius: 35,
  },
  {
    name: 'EXPEDITION', bodyKey: 'EXPEDITION',
    radius: 7, orbitRadius: 245, orbitSpeed: 0.00012, orbitAngle: 1.2,
    orbitInclination: -0.1, axialTilt: 0.35, rotationSpeed: 0.0009, isGasGiant: false,
    colorMap:       '/textures/red_laterite_soil_stones_diff_1k.jpg',
    normalMap:      '/textures/red_laterite_soil_stones_nor_gl_1k.png',
    displacementMap:'/textures/red_laterite_soil_stones_disp_1k.png', displacementScale: 0.3,
    roughnessMap:   '/textures/red_laterite_soil_stones_rough_1k.png',
    atmosphereColor: new THREE.Color(0xE67E22), atmosphereIntensity: 0.7,
    labelColor: '#E67E22', scanRadius: 35,
  },
  {
    name: 'CODEX', bodyKey: 'CODEX',
    radius: 14, orbitRadius: 285, orbitSpeed: 0.00009, orbitAngle: 3.8,
    orbitInclination: 0, axialTilt: 0.22, rotationSpeed: 0.0006, isGasGiant: false,
    colorMap:       '/textures/rock_embedded_concrete_wall_diff_1k.jpg',
    normalMap:      '/textures/rock_embedded_concrete_wall_nor_gl_1k.png',
    displacementMap:'/textures/rock_embedded_concrete_wall_disp_1k.png', displacementScale: 0.28,
    roughnessMap:   '/textures/rock_embedded_concrete_wall_rough_1k.png',
    atmosphereColor: new THREE.Color(0x1A9888), atmosphereIntensity: 0.9,
    labelColor: '#48C9B0', scanRadius: 50,
  },
]

export const STATION_CONFIG = {
  name: 'NOVARA', bodyKey: 'NOVARA',
  orbitRadius: 285, orbitSpeed: 0.00009, orbitAngle: 0.6,
  orbitInclination: 0.21,
  scanRadius: 35, labelColor: '#A8B2BC',
}
```

---

## Audio (`AudioSystem.js`)

```js
import { Howl, Howler } from 'howler'

const sounds = {}

export function init() {
  sounds.ambient    = new Howl({ src: ['/audio/ambient_space.mp3'], loop: true,  volume: 0.28 })
  sounds.proximity  = new Howl({ src: ['/audio/proximity_tone.mp3'],loop: false, volume: 0.5  })
  sounds.scanFire   = new Howl({ src: ['/audio/scan_fire.mp3'],     loop: false, volume: 0.7  })
  sounds.scanDone   = new Howl({ src: ['/audio/scan_complete.mp3'], loop: false, volume: 0.65 })
  sounds.moonUnlock = new Howl({ src: ['/audio/moon_unlock.mp3'],   loop: false, volume: 0.6  })
  sounds.thruster   = new Howl({ src: ['/audio/thruster.mp3'],      loop: true,  volume: 0    })
  sounds.comet      = new Howl({ src: ['/audio/comet_detected.mp3'],loop: false, volume: 0.55 })
  sounds.ambient.play()
  sounds.thruster.play()
}

export function play(key) { sounds[key]?.play() }

export function update() {
  // Scale thruster volume with ship speed
  const speed = state.shipVelocity.length()
  sounds.thruster.volume(THREE.MathUtils.clamp(speed / MAX_SPEED * 0.4, 0, 0.4))

  // Scale proximity tone volume with distance
  if (state.inScanRange && !state.panelOpen) {
    const vol = 1 - (state.nearestBodyDistance / state.nearestBody.config.scanRadius)
    sounds.proximity.volume(Math.max(0, vol) * 0.5)
    if (!sounds.proximity.playing()) sounds.proximity.play()
  } else {
    sounds.proximity.volume(0)
  }
}
```

---

## Build Order

Build in this exact sequence. Each phase should be independently testable before moving on.

| Phase | What to Build | Done When |
|-------|--------------|-----------|
| 1 | Vite project, Three.js renderer, EffectComposer + UnrealBloom, black scene | Bloom-lit scene renders with no errors |
| 2 | HELIOS star — shader + PointLight | Animated star surface visible, lights the scene |
| 3 | Starfield (BufferGeometry Points, 5000 verts, 3 size groups) | Space feels populated |
| 4 | Single planet (GENESIS) — sphere + textures + displacement + atmosphere shader | One textured glowing planet orbits the star |
| 5 | Ship — GLTF load + AssetLoader + engine glow. WASD controls + inertia | Can fly around, engine reacts to thrust |
| 6 | All remaining planets + orbital mechanics | Everything orbits correctly |
| 7 | Moon system — orbit parents, locked state visual | Moons visible, locked moons dim |
| 8 | Asteroid belt InstancedMesh | Belt renders in one draw call |
| 9 | Scan system — E press, pulse, panel open, moon unlock | Full scan loop works end-to-end |
| 10 | HUD — coords, proximity label, discovery log | HUD updates every frame |
| 11 | Camera modes — overview, flight, scan + GSAP transitions | Tab switches modes, scan transitions camera |
| 12 | NOVARA station — GLTF + running lights + scannable | Station works like a planet |
| 13 | Autopilot — click body in overview → fly to it | Overview is navigable |
| 14 | Comet — particle trail + one-shot appearance + scan | Comet traverses scene once per session |
| 15 | Audio — Howler init + proximity + thruster | Audio responsive to state |
| 16 | Polish — belt camera shake, scan trails, dark zone boundary | Final feel |

---

## Key Rules & Gotchas

**Model orientation:** Three.js forward is -Z. Most models export facing +Z or +Y. After loading, check and apply `model.rotation.y = Math.PI` or `model.rotation.x = -Math.PI/2` as needed. Add a debug key to log world orientation.

**Engine offsets:** The engine glow positions in `Ship.js` are hardcoded offsets. They WILL be wrong for your specific ship model. Build with placeholder values (0,0,5), run the game, press a debug key (`~`) to log the ship model's bounding box, and adjust.

**Displacement needs vertices:** `displacementMap` only works if the sphere has enough segments to displace. Use `SphereGeometry(r, 256, 256)` for any planet using displacement. Gas giant (SYNTHEX) uses `(r, 64, 64)` since it has no displacement.

**UnrealBloom threshold:** Set to `0.25`. Planets must NOT bloom (their emissive is 0 normally). HELIOS core, engine glows, and running lights MUST bloom (set their emissive or use `MeshBasicMaterial` which is treated as emissive). If planets bloom incorrectly, raise the threshold slightly.

**CSS2DRenderer z-index:** Its DOM element must be positioned `absolute` over the WebGL canvas. Set `pointerEvents: none` on the CSS2DRenderer element, but `pointerEvents: all` on individual labels you want to be clickable (for autopilot navigation).

**`depthWrite: false`:** Set this on ALL transparent materials — atmosphere sphere, scan pulse, engine glow. Missing this causes transparent objects to cut holes in opaque objects behind them.

**Orbit group nesting:** Do NOT move `orbitGroup.position`. Only rotate it on Y to orbit. The planet's local position (`planetGroup.position.x = orbitRadius`) is what places it on the ring. Moving the group breaks everything.

**GSAP + Three.js:** GSAP can tween `camera.position.x/y/z` and `material.opacity` directly. For `THREE.Color`, use `gsap.to(material.color, { r:..., g:..., b:... })`. Do not pass the Color object itself.

**Performance:** Target 60fps. InstancedMesh for asteroids is required. Planet sphere segments (256×256) are expensive — only use for the 5 main planets. Moons use `(radius, 32, 32)`. CSS2DRenderer runs every frame but is cheap — fine to call always.

**Audio autoplay:** Browsers block audio until user interaction. Start `AudioSystem.init()` inside a click handler (the "Press any key to launch" screen that hides the loading overlay works well for this).
