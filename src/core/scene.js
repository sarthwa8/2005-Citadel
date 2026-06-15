import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

export let renderer;
export let composer;
export let css2DRenderer;
export let scene;

export function initScene(threeScene) {
  scene = threeScene;

  // WebGL renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  // CSS2D renderer (planet labels)
  css2DRenderer = new CSS2DRenderer();
  css2DRenderer.setSize(window.innerWidth, window.innerHeight);
  css2DRenderer.domElement.style.position = "absolute";
  css2DRenderer.domElement.style.top = "0";
  css2DRenderer.domElement.style.pointerEvents = "none";
  document.body.appendChild(css2DRenderer.domElement);

  // Ambient light — very dark blue
  scene.add(new THREE.AmbientLight(0x0a0a2a, 0.8));

  // Hemisphere fill — simulates diffuse starfield glow so the ship's star-shadowed
  // side stays readable without flattening planet day/night contrast (the light is
  // direction-dependent and the sky color is dim blue). The ship model is largely
  // self-lit, so a modest 2.8 is plenty.
  scene.add(new THREE.HemisphereLight(0x223355, 0x080810, 2.8));

  // Nebula "gel" fill — four gentle colour lights from different directions
  // (violet, teal, magenta, amber), echoing the nebula palette. The sun stays the
  // warm key; these wash the planets and ship in a mix of colour so a given surface
  // catches different hues depending on which way it faces — the whole system reads
  // as lit by the surrounding gas, not lone starlight. Directional = uniform across
  // the system and distance-independent, easy to balance against the physical sun.
  // Intensities are kept modest so four lights add variety without flattening the
  // day/night contrast.
  const fills = [
    { color: 0x7a4dff, intensity: 1.8, pos: [-900, 520, -680] }, // violet
    { color: 0x2fe6ce, intensity: 1.5, pos: [880, -360, 720] }, // teal
    { color: 0xff4d9d, intensity: 1.3, pos: [720, 600, 480] }, // magenta
    { color: 0xffa63d, intensity: 1.1, pos: [-640, -520, 660] }, // amber
  ];
  for (const f of fills) {
    const light = new THREE.DirectionalLight(f.color, f.intensity);
    light.position.set(...f.pos);
    scene.add(light);
  }

  // EffectComposer — built after renderer so it uses the same render target size
  // (camera is passed into RenderPass lazily via updateCamera())
  composer = new EffectComposer(renderer);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8, // strength
    0.5, // radius
    0.25, // threshold — planets don't bloom, only emissive elements do
  );
  // RenderPass is added later once the camera exists (see initComposerPasses)

  composer._bloomPass = bloomPass;

  // Resize handler
  window.addEventListener("resize", onResize);
}

// Retro pixel-game mode — off by default so the normal look is unchanged. Toggle
// at runtime with setPixelated() (bound to P in main.js). It crisply downsamples
// the scene (RenderPixelatedPass) with chunky outlines on solid bodies, cuts bloom
// right down so the pixels stay sharp instead of glowing, and posterizes the final
// image to a limited palette — the flat, banded colour that reads as pixel art.
const PIXEL_SIZE = 5;
const COLOR_LEVELS = 8; // posterize steps per channel (lower = more retro)
const BLOOM_NORMAL = 0.5; // matches the bloom strength set in initScene
const BLOOM_PIXEL = 0.2; // crisp pixels want very little glow
let _renderPass, _pixelPass, _posterizePass;

// Final pass: quantise each colour channel to COLOR_LEVELS steps → limited palette.
const PosterizeShader = {
  uniforms: { tDiffuse: { value: null }, levels: { value: COLOR_LEVELS } },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float levels;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = floor(c * levels + 0.5) / levels;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function initComposerPasses(camera) {
  _renderPass = new RenderPass(scene, camera);
  _pixelPass = new RenderPixelatedPass(PIXEL_SIZE, scene, camera);
  _pixelPass.normalEdgeStrength = 0.4; // chunky outlines on solid bodies (game look)
  _pixelPass.depthEdgeStrength = 0.3;
  _pixelPass.enabled = false; // start OFF — current look is unchanged

  _posterizePass = new ShaderPass(PosterizeShader);
  _posterizePass.enabled = false;

  composer.addPass(_renderPass);
  composer.addPass(_pixelPass);
  composer.addPass(composer._bloomPass);
  composer.addPass(new OutputPass());
  composer.addPass(_posterizePass); // last — palette-quantise the final image
}

// Toggle the retro pixel-game look: swap render passes, drop bloom, add palette.
export function setPixelated(on) {
  if (!_pixelPass) return;
  _pixelPass.enabled = on;
  _renderPass.enabled = !on;
  _posterizePass.enabled = on;
  composer._bloomPass.strength = on ? BLOOM_PIXEL : BLOOM_NORMAL;
}
export function isPixelated() {
  return !!_pixelPass?.enabled;
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  css2DRenderer.setSize(w, h);
  composer.setSize(w, h);
}
