import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// The asteroid belt sits between SYNTHEX (orbit 185) and ACADEMY (orbit 290), on a
// torus of ring radius 230. (Outer planets: EXPEDITION 375, CODEX 460.)
// All 200 rocks share ONE geometry + material via InstancedMesh, so the whole belt
// is a single draw call. Four larger GOLD asteroids ride the same ring as scannable
// "achievement" markers (bound to ASTEROIDS data in a later phase) — they're emissive
// so they catch the eye and bloom.
const BELT_COUNT       = 200
const GOLD_COUNT       = 4
const BELT_RING_RADIUS = 230
const BELT_TUBE        = 8       // vertical + radial spread of the belt
const BELT_ROT_SPEED   = 0.00002 // rad/ms — a slow orbital drift, slower than any planet

export class AsteroidBelt {
  constructor() {
    this.group = new THREE.Group()
    this.ready = false
    this.belt = null
    this.gold = null
    // Local positions of the gold asteroids; world pos = group transform × this.
    // Kept for the scan system (Phase 9) to target each achievement marker.
    this.goldData = []

    const loader = new GLTFLoader()
    loader.load(
      '/models/asteroid_low_poly.glb',
      gltf => this._onLoad(gltf),
      undefined,
      err => console.error('[AsteroidBelt] GLTF load failed:', err),
    )
  }

  _onLoad(gltf) {
    // Some GLB exports flag "hidden" nodes with scale 0 (the ship model did this) —
    // force them to 1 so their geometry survives the world-matrix bake below.
    gltf.scene.traverse(n => {
      if (n.scale && n.scale.x < 0.001 && n.scale.y < 0.001 && n.scale.z < 0.001) {
        n.scale.set(1, 1, 1)
      }
    })
    gltf.scene.updateMatrixWorld(true)

    // Collect every mesh's geometry (baked into world space so nested transforms are
    // preserved) plus the first material to texture the rocks.
    const geos = []
    let sourceMat = null
    gltf.scene.traverse(n => {
      if (n.isMesh && n.geometry) {
        const g = n.geometry.clone()
        g.applyMatrix4(n.matrixWorld)
        geos.push(g)
        if (!sourceMat) sourceMat = n.material
      }
    })
    if (geos.length === 0) {
      console.error('[AsteroidBelt] no mesh found in GLB')
      return
    }

    // Single mesh → use directly; multi-mesh → merge into one buffer (still one draw call).
    let geo = geos.length === 1 ? geos[0] : mergeGeometries(geos, false)

    // Normalize the base rock to origin-centered, unit radius. The spec's instance
    // scales (0.3–2.2) assume a roughly unit asteroid, so this makes those scales
    // produce real-unit sizes regardless of the model's native dimensions.
    geo.computeBoundingSphere()
    const { center, radius } = geo.boundingSphere
    geo.translate(-center.x, -center.y, -center.z)
    if (radius > 1e-6) geo.scale(1 / radius, 1 / radius, 1 / radius)

    // Rocky material — roughened, near-zero metalness, no emissive so it does NOT bloom.
    const mat = sourceMat
      ? sourceMat.clone()
      : new THREE.MeshStandardMaterial({ color: 0x6b6b6b })
    mat.roughness = 0.92
    mat.metalness = 0.05

    // Gold achievement material — emissive gold reads as "special" and crosses the
    // bloom threshold so these glow even on the star-shadowed side of the belt.
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xFFCC33, emissive: 0xFFAA00, emissiveIntensity: 0.5,
      roughness: 0.35, metalness: 0.7,
    })

    this.belt = new THREE.InstancedMesh(geo, mat, BELT_COUNT)
    this.gold = new THREE.InstancedMesh(geo, goldMat, GOLD_COUNT)

    // InstancedMesh culls against the base geometry's bounds (a unit sphere at the
    // origin) unless told otherwise — which would wrongly cull the whole ring whenever
    // the origin leaves the frustum. The belt is effectively always on-screen, so just
    // disable frustum culling for both meshes.
    this.belt.frustumCulled = false
    this.gold.frustumCulled = false

    const dummy = new THREE.Object3D()

    // ── Main belt — 200 rocks scattered along the torus ──
    for (let i = 0; i < BELT_COUNT; i++) {
      const angle = (i / BELT_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
      const r = BELT_RING_RADIUS + (Math.random() - 0.5) * 16
      const y = (Math.random() - 0.5) * BELT_TUBE
      dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r)
      dummy.rotation.set(
        Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI,
      )
      dummy.scale.setScalar(0.3 + Math.random() * 2.2)
      dummy.updateMatrix()
      this.belt.setMatrixAt(i, dummy.matrix)
    }
    this.belt.instanceMatrix.needsUpdate = true

    // ── Gold achievement asteroids — evenly spaced, larger, sitting on the ring center ──
    for (let i = 0; i < GOLD_COUNT; i++) {
      const angle = (i / GOLD_COUNT) * Math.PI * 2 + Math.PI / GOLD_COUNT
      const pos = new THREE.Vector3(
        Math.cos(angle) * BELT_RING_RADIUS, 0, Math.sin(angle) * BELT_RING_RADIUS,
      )
      dummy.position.copy(pos)
      dummy.rotation.set(
        Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI,
      )
      dummy.scale.setScalar(3.0)
      dummy.updateMatrix()
      this.gold.setMatrixAt(i, dummy.matrix)
      this.goldData.push({ position: pos })
    }
    this.gold.instanceMatrix.needsUpdate = true

    this.group.add(this.belt, this.gold)
    this.ready = true
  }

  // Slow rigid drift of the whole belt. Called each frame with deltaMs.
  update(deltaMs) {
    if (!this.ready) return
    this.group.rotation.y += BELT_ROT_SPEED * deltaMs
  }

  // World-space position of a gold achievement asteroid (used by the scan system).
  goldWorldPosition(i, target = new THREE.Vector3()) {
    return target.copy(this.goldData[i].position).applyMatrix4(this.group.matrixWorld)
  }
}
