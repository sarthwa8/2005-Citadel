// Advances every planet's orbit and self-rotation each frame. Orbit/rotation
// speeds are radians-per-millisecond, so the game loop passes deltaMs.
// Orbital inclination is constant and set once in the Planet constructor.
// Moon orbits are added in Phase 7 alongside Moon.js.
export function update(planets, deltaMs) {
  for (const planet of planets) {
    planet.config.orbitAngle += planet.config.orbitSpeed * deltaMs
    planet.orbitGroup.rotation.y = planet.config.orbitAngle
    planet.update(deltaMs)
  }
}
