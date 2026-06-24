import * as THREE from 'three'

// A large inverted sky-sphere painted with a soft, wispy procedural nebula so deep
// space carries colour the way real galaxies do — instead of flat black. Purple/violet
// forward, with teal, blue and magenta regions drifting across the sky. Domain-warped
// fbm gives filament structure (not uniform mush, not hard-edged blobs), and a very slow
// time drift keeps it subtly alive. Low intensity throughout: a faint mood, never
// foreground. Sits just inside the starfield's outer radius.

const VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;
  varying vec3 vDir;
  uniform float uIntensity;
  uniform float uTime;

  // --- compact 3D value-noise + fbm ---
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
                       dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                   mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                       dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
               mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                       dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                   mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                       dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return 0.5 + 0.5 * v;   // remap to ~[0,1]
  }

  void main() {
    vec3 d = normalize(vDir);
    float t = uTime * 0.006;   // very slow evolution

    // Wispy filaments from just 3 fbm taps: one base field, one domain-warped by
    // the base (the warp is what makes it look like gas, not fog), and one
    // large-scale field that selects the dominant hue per area of sky. Kept to 3
    // taps × 4 octaves so this full-screen backdrop stays cheap.
    float base   = fbm(d * 2.0 + vec3(0.0, 0.0, t));
    float warp   = fbm(d * 4.2 + base * 1.5 + vec3(t, 0.0, -t));
    float region = fbm(d * 0.9 + 3.0);

    // Wider, softer density → more of the sky carries colour (Guardians-of-the-
    // Galaxy vibe — vibrant, not a faint wash).
    float density = smoothstep(0.40, 0.94, base * 0.62 + warp * 0.38);

    // Saturated, alien GotG palette.
    vec3 indigo  = vec3(0.20, 0.10, 0.66);
    vec3 violet  = vec3(0.58, 0.16, 0.92);
    vec3 blue    = vec3(0.10, 0.40, 0.95);
    vec3 cyan    = vec3(0.05, 0.72, 0.78);
    vec3 magenta = vec3(0.95, 0.16, 0.62);
    vec3 orange  = vec3(0.98, 0.46, 0.16);

    // Multi-region colour — reuse the 3 fields (no extra fbm taps) for varied hues.
    vec3 col = mix(indigo, violet, smoothstep(0.25, 0.82, region));
    col = mix(col, blue,    smoothstep(0.28, 0.74, warp)          * 0.60);
    col = mix(col, cyan,    smoothstep(0.50, 0.92, region)        * 0.60);
    col = mix(col, magenta, smoothstep(0.55, 1.0,  base)          * 0.60);
    col = mix(col, orange,  smoothstep(0.72, 1.0,  region * warp) * 0.40);

    // Bright filament cores; gentler power so the colour spreads further.
    float glow = pow(density, 1.3);
    gl_FragColor = vec4(col * glow * uIntensity, 1.0);
  }
`

export class Nebula {
  constructor() {
    const geo = new THREE.SphereGeometry(2400, 48, 48)
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 1.3 },
        uTime:      { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,         // always behind everything
      blending: THREE.AdditiveBlending,
    })
    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.renderOrder = -1   // draw first, as a backdrop
    this.group = this.mesh
  }

  // elapsed seconds — drives the slow nebula drift.
  update(elapsed) {
    this.material.uniforms.uTime.value = elapsed
  }
}
