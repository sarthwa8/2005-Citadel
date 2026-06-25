import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { makeGlowSprite } from "../core/glow.js";

// HELIOS — the system's star. Uses a textured GLB model (auto-normalized to
// SUN_RADIUS) instead of the old procedural shader sphere, which read as a
// featureless white blob once bloom amplified it. A faint additive corona gives
// the limb a soft halo, and the scene PointLight is intentionally moderate so the
// planets are lit without being washed out.
const SUN_RADIUS = 24;

// Anamorphic lens-streak texture: a bright horizontal bar that fades to nothing at
// both ends and top/bottom — the signature Mass Effect "star flare across the
// screen" look. Built once, reused.
function makeStreakTexture() {
  const w = 512,
    h = 64;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const hg = ctx.createLinearGradient(0, 0, w, 0);
  hg.addColorStop(0.0, "rgba(255,255,255,0)");
  hg.addColorStop(0.5, "rgba(255,255,255,1)");
  hg.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, h);
  // Multiply by a vertical falloff so it's a thin streak, not a band.
  ctx.globalCompositeOperation = "destination-in";
  const vg = ctx.createLinearGradient(0, 0, 0, h);
  vg.addColorStop(0.0, "rgba(0,0,0,0)");
  vg.addColorStop(0.5, "rgba(0,0,0,1)");
  vg.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(c);
}

export class Star {
  constructor() {
    this.group = new THREE.Group();
    this.ready = false;

    // Spin group so the sun rotates slowly without moving the light/corona.
    this.spin = new THREE.Group();
    this.group.add(this.spin);

    // Soft diffuse corona — a camera-facing halo that fades naturally into space
    // (a layered pair: a tight warm core glow + a broad faint outer wash).
    this.coronaInner = makeGlowSprite(0xffc070, SUN_RADIUS * 3.0, 0.55);
    this.coronaOuter = makeGlowSprite(0xe89048, SUN_RADIUS * 6.5, 0.22);
    this.group.add(this.coronaInner, this.coronaOuter);

    // Anamorphic lens flare — a wide, thin horizontal light streak through the star
    // (Mass Effect look). Camera-facing sprite with depthTest off so it always reads
    // as a screen-space flare on top of the star and corona.
    this.flare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeStreakTexture(),
        color: 0xffe8c8,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.flare.scale.set(SUN_RADIUS * 4, SUN_RADIUS * 1.2, 1);
    this.flare.renderOrder = 12;
    this.group.add(this.flare);

    // Primary scene light — warm, moderate. distance=0 (no cutoff), decay=1.2 so it
    // still reaches CODEX/NOVARA at r=285; intensity dialled down from the old 200
    // so planets read as worlds, not over-exposed.
    this.light = new THREE.PointLight(0xffd9a0, 150, 0, 1.2);
    this.group.add(this.light);

    const loader = new GLTFLoader();
    loader.load(
      "/models/uploads_files_4395783_Sun.glb",
      (gltf) => this._onLoad(gltf),
      undefined,
      (err) => console.error("[Star] GLTF load failed:", err),
    );
  }

  _onLoad(gltf) {
    const model = gltf.scene;

    // Auto-normalize: recenter + uniform-scale so the sun's diameter = SUN_RADIUS*2,
    // regardless of the export's native units.
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const s = (SUN_RADIUS * 2) / longest;
    model.scale.setScalar(s);
    model.position.copy(center).multiplyScalar(-s);

    model.traverse((n) => {
      if (n.isMesh && n.material) {
        // Make the surface self-lit and warm: reuse the colour map as an emissive
        // map so the sun glows with its own texture and blooms like a star, but
        // still shows surface detail instead of clipping to flat white.
        const m = n.material;
        if (m.map) {
          m.emissiveMap = m.map;
          m.emissive = new THREE.Color(0xffffff);
        } else {
          m.emissive = new THREE.Color(0xffb347);
        }
        m.emissiveIntensity = 0.85;
        m.needsUpdate = true;
      }
    });

    this.spin.add(model);
    this.model = model;
    this.ready = true;
  }

  update(elapsed) {
    this.spin.rotation.y = elapsed * 0.02;
    // Subtle corona breathing
    this.coronaInner.material.opacity = 0.52 + 0.06 * Math.sin(elapsed * 0.7);
    this.coronaOuter.material.opacity =
      0.2 + 0.04 * Math.sin(elapsed * 0.5 + 1.0);
    // Lens flare shimmer
    this.flare.material.opacity = 0.4 + 0.14 * Math.sin(elapsed * 1.3);
  }
}
