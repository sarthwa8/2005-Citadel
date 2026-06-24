import * as THREE from "three";
import { state } from "../state.js";

// Keeps the star map clean by revealing body labels only when they're relevant:
//   • Flight / scan: a body's label fades in when the SHIP gets near it.
//   • Overview:      a planet/station label fades in when the MOUSE is near its
//                    on-screen position (so you can still find + click to travel);
//                    moon labels stay hidden — from afar they'd just be clutter.
// Visibility is a `.label-shown` class toggled on each label element; the fade and
// the pointer-events (click) gating live in CSS.

let planets = [];
let station = null;
let cam = null;
let mouseX = -9999;
let mouseY = -9999;

const PLANET_REVEAL_MULT = 3.2; // ship within scanRadius * this → planet/station label shows
const MOON_REVEAL = 30;         // ship within this distance of a moon → moon label shows
const HOVER_PX = 95;            // overview: mouse within this many px of a body → its label shows

const _wp = new THREE.Vector3();

export function init({ planets: p, station: s, camera }) {
  planets = p;
  station = s;
  cam = camera;
  window.addEventListener("pointermove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener("pointerleave", () => { mouseX = -9999; mouseY = -9999; });
}

const show = (el, on) => el?.classList.toggle("label-shown", on);

// Mouse distance (px) to a world point's screen projection; Infinity if behind cam.
function mouseDistTo(worldPos) {
  _wp.copy(worldPos).project(cam);
  if (_wp.z > 1) return Infinity;
  const sx = (_wp.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-_wp.y * 0.5 + 0.5) * window.innerHeight;
  return Math.hypot(sx - mouseX, sy - mouseY);
}

export function update() {
  // MAP view → reveal on MOUSE hover (so you can find + click worlds to travel).
  // DRIVE / SCAN → reveal on SHIP proximity (you fly up close).
  const proximity = !(state.cameraMode === "flight" && state.flightCam === "map");

  for (const planet of planets) {
    const on = proximity
      ? state.shipPosition.distanceTo(planet.worldPosition()) < (planet.config.scanRadius ?? 35) * PLANET_REVEAL_MULT
      : mouseDistTo(planet.worldPosition()) < HOVER_PX;
    show(planet.labelEl, on);

    for (const moon of planet.moons) {
      // Moons only ever show up close (ship proximity) — never clutter the map.
      show(moon.labelEl, proximity && state.shipPosition.distanceTo(moon.worldPosition()) < MOON_REVEAL);
    }
  }

  if (station?.ready) {
    const on = proximity
      ? state.shipPosition.distanceTo(station.worldPosition()) < (station.config.scanRadius ?? 35) * PLANET_REVEAL_MULT
      : mouseDistTo(station.worldPosition()) < HOVER_PX;
    show(station.labelEl, on);
  }
}
