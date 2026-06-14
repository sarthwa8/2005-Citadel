import * as THREE from 'three'

const keys = new Set()

export function init() {
  window.addEventListener('keydown', e => {
    keys.add(e.code)
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
      e.preventDefault()
    }
  })
  window.addEventListener('keyup', e => keys.delete(e.code))
}

export function isPressed(code) {
  return keys.has(code)
}

// Returns a raw intent vector summarizing held movement keys. Ship.update()
// reads individual keys via isPressed() for its arcade controls (A/D = yaw,
// W/S = thrust along the nose, Space/Shift = vertical); this aggregate serves
// systems that only care whether the pilot is steering at all (e.g. the
// AutopilotSystem manual-override cancel).
//   z: -1 = forward (W),   +1 = backward (S)
//   x: -1 = left (A),      +1 = right (D)
//   y: +1 = up (Space),    -1 = down (Shift / Ctrl)
export function getRawThrust() {
  const v = new THREE.Vector3()
  if (keys.has('KeyW') || keys.has('ArrowUp'))    v.z -= 1
  if (keys.has('KeyS') || keys.has('ArrowDown'))  v.z += 1
  if (keys.has('KeyA') || keys.has('ArrowLeft'))  v.x -= 1
  if (keys.has('KeyD') || keys.has('ArrowRight')) v.x += 1
  if (keys.has('Space'))                          v.y += 1
  if (keys.has('ShiftLeft') || keys.has('ControlLeft')) v.y -= 1
  if (v.lengthSq() > 1) v.normalize()
  return v
}
