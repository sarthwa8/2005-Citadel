import * as THREE from 'three'

// A large inverted sky-sphere painted with soft procedural nebula clouds, so deep
// space carries a subtle multi-colour wash (violet/blue/teal/magenta) the way real
// galaxies do — instead of flat black. Very low intensity: it should read as a
// faint mood, never as foreground. Sits just inside the starfield's outer radius.

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
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float n  = fbm(d * 2.2);
    float n2 = fbm(d * 4.5 + 11.3);
    float density = smoothstep(0.05, 0.65, n * 0.7 + n2 * 0.3);

    // Multi-colour mix driven by the noise fields
    vec3 violet = vec3(0.42, 0.18, 0.62);
    vec3 blue   = vec3(0.12, 0.22, 0.55);
    vec3 teal   = vec3(0.10, 0.42, 0.45);
    vec3 magenta= vec3(0.55, 0.16, 0.45);
    vec3 col = mix(violet, blue, smoothstep(0.2, 0.8, n2));
    col = mix(col, teal,    smoothstep(0.3, 0.9, fbm(d * 3.1 - 5.0)) * 0.6);
    col = mix(col, magenta, smoothstep(0.55, 1.0, n) * 0.4);

    gl_FragColor = vec4(col * density * uIntensity, 1.0);
  }
`

export class Nebula {
  constructor() {
    const geo = new THREE.SphereGeometry(2400, 48, 48)
    this.material = new THREE.ShaderMaterial({
      uniforms: { uIntensity: { value: 0.5 } },
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
}
