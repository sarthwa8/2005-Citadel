import * as THREE from "three";

// Distant supernovae — gorgeous, layered bursts of colour that bloom in, sparkle,
// and fade out gracefully in the far field. No explosion/shockwave (per the brief),
// just colour: each is a hot tinted CORE + a complementary-coloured HALO + a slowly
// rotating diffraction-spike GLINT (the camera-flare "star" that sells it). A small
// pool of reusable sprite triples; one blooms every ~7–13s. Cheap (additive sprites).

const POOL = 3;
const DUR_MS = 7000; // long, graceful bloom
const MIN_GAP = 7000;
const MAX_GAP = 13000;
const CORE_SIZE = 150;
const HALO_SIZE = 440;
const GLINT_SIZE = 340;

// Gorgeous complementary colour pairs: [core, halo].
const PAIRS = [
  [0x66e0ff, 0xff5ea8], // cyan + magenta
  [0xffd24a, 0xff6ab0], // gold + pink
  [0x9a6bff, 0x5bffd0], // violet + teal
  [0x5b8cff, 0xff8a3d], // blue + amber
  [0x4affc0, 0xb06bff], // emerald + violet
  [0xff7ad0, 0x66e0ff], // pink + cyan
];

// Soft radial glow (white core → transparent) — reused for core + halo (tinted).
function glowTexture() {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(255,255,255,0.5)");
  g.addColorStop(0.65, "rgba(255,255,255,0.12)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

// Diffraction "star" glint: 4 long primary spikes + 4 short diagonals + hot center.
function glintTexture() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  ctx.translate(s / 2, s / 2);
  ctx.globalCompositeOperation = "lighter";

  const spike = (len, halfW, alpha) => {
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0.0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.45, `rgba(255,255,255,${alpha * 0.22})`);
    g.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -halfW);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, halfW);
    ctx.closePath();
    ctx.fill();
  };

  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate((i * Math.PI) / 2); spike(s * 0.48, 6, 0.9); ctx.restore(); }
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(Math.PI / 4 + (i * Math.PI) / 2); spike(s * 0.3, 3.5, 0.5); ctx.restore(); }

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.14);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

export class Supernova {
  constructor() {
    this.group = new THREE.Group();
    this.items = [];
    this.timer = 0;
    this.nextMs = 4000;

    const glow = glowTexture();
    const glint = glintTexture();
    const mk = (map) =>
      new THREE.Sprite(
        new THREE.SpriteMaterial({
          map, transparent: true, opacity: 0,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }),
      );

    for (let i = 0; i < POOL; i++) {
      const halo = mk(glow);
      const core = mk(glow);
      const spike = mk(glint);
      halo.visible = core.visible = spike.visible = false;
      this.group.add(halo, core, spike);
      this.items.push({ halo, core, spike, active: false, t: 0 });
    }

    this._white = new THREE.Color(0xffffff);
  }

  update(deltaMs) {
    this.timer += deltaMs;
    if (this.timer >= this.nextMs) {
      this.timer = 0;
      this.nextMs = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
      this._spawn();
    }
    for (const it of this.items) if (it.active) this._step(it, deltaMs);
  }

  _spawn() {
    const it = this.items.find((x) => !x.active);
    if (!it) return;
    const pos = new THREE.Vector3().randomDirection().multiplyScalar(900 + Math.random() * 700);
    it.halo.position.copy(pos);
    it.core.position.copy(pos);
    it.spike.position.copy(pos);

    const [a, b] = PAIRS[(Math.random() * PAIRS.length) | 0];
    it.core.material.color.set(a);
    it.halo.material.color.set(b);
    it.spike.material.color.set(a).lerp(this._white, 0.6); // hot, lightly tinted glint

    it.t = 0;
    it.active = true;
    it.halo.visible = it.core.visible = it.spike.visible = true;
  }

  _step(it, deltaMs) {
    it.t += deltaMs;
    const p = it.t / DUR_MS;
    if (p >= 1) {
      it.active = false;
      it.halo.visible = it.core.visible = it.spike.visible = false;
      return;
    }
    // Smooth ease-in → hold → ease-out: a graceful colour bloom, never a blast.
    const env = THREE.MathUtils.smoothstep(p, 0.0, 0.2) * (1 - THREE.MathUtils.smoothstep(p, 0.55, 1.0));
    const breath = 1 + 0.08 * Math.sin(p * Math.PI);

    it.core.material.opacity = env * 0.95;
    it.core.scale.setScalar(CORE_SIZE * breath);

    it.halo.material.opacity = env * 0.55;
    it.halo.scale.setScalar(HALO_SIZE * breath);

    // Glint sparkles (gentle twinkle) and rotates slowly for life.
    it.spike.material.opacity = env * 0.85 * (0.72 + 0.28 * Math.sin(it.t * 0.006));
    it.spike.scale.setScalar(GLINT_SIZE * (1 + 0.14 * Math.sin(p * Math.PI)));
    it.spike.material.rotation = it.t * 0.0004;
  }
}
