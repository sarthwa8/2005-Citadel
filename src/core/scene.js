import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'

export let renderer
export let composer
export let css2DRenderer
export let scene

export function initScene(threeScene) {
  scene = threeScene

  // WebGL renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  document.body.appendChild(renderer.domElement)

  // CSS2D renderer (planet labels)
  css2DRenderer = new CSS2DRenderer()
  css2DRenderer.setSize(window.innerWidth, window.innerHeight)
  css2DRenderer.domElement.style.position = 'absolute'
  css2DRenderer.domElement.style.top = '0'
  css2DRenderer.domElement.style.pointerEvents = 'none'
  document.body.appendChild(css2DRenderer.domElement)

  // Ambient light — very dark blue
  scene.add(new THREE.AmbientLight(0x0a0a2a, 0.8))

  // Hemisphere fill — simulates diffuse starfield glow so the ship's star-shadowed
  // side stays readable without flattening planet day/night contrast (the light is
  // direction-dependent and the sky color is dim blue). The ship model is largely
  // self-lit, so a modest 2.8 is plenty.
  scene.add(new THREE.HemisphereLight(0x223355, 0x080810, 2.8))

  // EffectComposer — built after renderer so it uses the same render target size
  // (camera is passed into RenderPass lazily via updateCamera())
  composer = new EffectComposer(renderer)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8,   // strength
    0.5,   // radius
    0.25   // threshold — planets don't bloom, only emissive elements do
  )
  // RenderPass is added later once the camera exists (see initComposerPasses)

  composer._bloomPass = bloomPass

  // Resize handler
  window.addEventListener('resize', onResize)
}

export function initComposerPasses(camera) {
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(composer._bloomPass)
  composer.addPass(new OutputPass())
}

function onResize() {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h)
  css2DRenderer.setSize(w, h)
  composer.setSize(w, h)
}
