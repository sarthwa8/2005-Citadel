import * as THREE from 'three'

// Landing / briefing overlay. A flowing Aurora background (a vanilla port of
// React Bits' "Aurora" WebGL shader, rendered with Three.js so we add no React),
// the title split into per-character spans for a staggered reveal (SplitText),
// and an ENTER gate that arms audio and dismisses the overlay into the live system.

// Aurora ribbon colours — teal → blue → violet, matched to the title shimmer and
// the nebula clouds so the landing and the system read as one palette.
const AURORA_STOPS = [0x4FD6C0, 0x4A90D9, 0x9B59B6]
const AMPLITUDE = 1.1
const BLEND     = 0.5

export function initLanding(onEnter) {
  const landing = document.getElementById('landing')
  const canvas = document.getElementById('galaxy-canvas')

  splitTitle()
  const stop = startAurora(canvas)

  const enter = () => {
    if (landing.classList.contains('dismissed')) return
    landing.classList.add('dismissed')
    onEnter?.()
    setTimeout(() => {
      landing.style.display = 'none'
      stop()
    }, 1050)
  }

  document.getElementById('enter-btn').addEventListener('click', enter)
  window.addEventListener('keydown', e => {
    if ((e.code === 'Enter' || e.code === 'Space') &&
        !landing.classList.contains('dismissed')) {
      e.preventDefault()
      enter()
    }
  })
}

// ── SplitText: wrap each title glyph so CSS can stagger it in ─────────────────
function splitTitle() {
  const title = document.getElementById('landing-title')
  const text = title.textContent
  title.textContent = ''
  let i = 0
  for (const ch of text) {
    const span = document.createElement('span')
    span.className = 'char'
    span.textContent = ch === ' ' ? ' ' : ch
    span.style.setProperty('--i', i++)
    title.appendChild(span)
  }
}

// ── Aurora: flowing ribbons via a fullscreen fragment shader (React Bits port) ─
const AURORA_VERT = /* glsl */`
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const AURORA_FRAG = /* glsl */`
  precision highp float;
  out vec4 fragColor;

  uniform float uTime;
  uniform float uAmplitude;
  uniform float uBlend;
  uniform vec2  uResolution;
  uniform vec3  uColorStops[3];

  // --- Simplex noise (Ashima) ---
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  struct ColorStop { vec3 color; float position; };

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;

    ColorStop colors[3];
    colors[0] = ColorStop(uColorStops[0], 0.0);
    colors[1] = ColorStop(uColorStops[1], 0.5);
    colors[2] = ColorStop(uColorStops[2], 1.0);

    // Horizontal colour ramp across the three stops.
    int idx = 0;
    for (int i = 0; i < 2; i++) {
      if (colors[i].position <= uv.x) idx = i;
    }
    ColorStop cur  = colors[idx];
    ColorStop nxt  = colors[idx + 1];
    float range    = nxt.position - cur.position;
    float lerpF    = (uv.x - cur.position) / range;
    vec3 rampColor = mix(cur.color, nxt.color, clamp(lerpF, 0.0, 1.0));

    float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
    height = exp(height);
    height = (uv.y * 2.0 - height + 0.2);
    float intensity = 0.6 * height;

    float midPoint = 0.20;
    float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

    vec3 auroraColor = intensity * rampColor;
    fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
  }
`

function startAurora(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)   // transparent → the CSS gradient shows through

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()      // unused by the shader (clip-space verts)

  const stops = AURORA_STOPS.map(hex => {
    const c = new THREE.Color(hex)       // r167 converts sRGB hex → linear working space
    return new THREE.Vector3(c.r, c.g, c.b)
  })

  const uniforms = {
    uTime:       { value: 0 },
    uAmplitude:  { value: AMPLITUDE },
    uBlend:      { value: BLEND },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uColorStops: { value: stops },
  }

  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,             // WebGL2 → dynamic array indexing in the ramp loop
    vertexShader: AURORA_VERT,
    fragmentShader: AURORA_FRAG,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(quad)

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2())
    uniforms.uResolution.value.set(buf.x, buf.y)
  }
  window.addEventListener('resize', resize)
  resize()

  let raf, running = true
  const start = performance.now()
  function frame(now) {
    if (!running) return
    uniforms.uTime.value = (now - start) / 1000
    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  return () => {
    running = false
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    quad.geometry.dispose()
    material.dispose()
    renderer.dispose()
  }
}
