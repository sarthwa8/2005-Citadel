import * as THREE from 'three'

// Shared soft radial-glow sprite. A camera-facing billboard with a smooth radial
// alpha gradient gives planets/stars a halo that DIFFUSES naturally into space —
// far more natural than a hard fresnel rim ring. The opaque body covers the bright
// centre, leaving only the soft outer falloff visible around its limb.

let _tex = null
function gradientTexture() {
  if (_tex) return _tex
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  // Gentle, wide falloff — no hard edges anywhere.
  g.addColorStop(0.00, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.22, 'rgba(255,255,255,0.34)')
  g.addColorStop(0.50, 'rgba(255,255,255,0.09)')
  g.addColorStop(0.78, 'rgba(255,255,255,0.02)')
  g.addColorStop(1.00, 'rgba(255,255,255,0.00)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  _tex = new THREE.CanvasTexture(c)
  _tex.colorSpace = THREE.SRGBColorSpace
  return _tex
}

// color: THREE.Color or hex. scale: sprite world size. opacity: peak strength.
export function makeGlowSprite(color, scale, opacity = 1) {
  const mat = new THREE.SpriteMaterial({
    map: gradientTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.setScalar(scale)
  return sprite
}
