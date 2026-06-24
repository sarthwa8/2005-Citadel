import * as THREE from 'three'

// Orbital + visual config for the 5 HELIOS planets. Starting orbitAngles are
// staggered so planets don't cluster. orbitSpeed/rotationSpeed are radians-per-
// millisecond — OrbitalMechanics is driven with deltaMs to match.
export const PLANET_CONFIGS = [
  {
    name: 'GENESIS', bodyKey: 'GENESIS',
    radius: 6, orbitRadius: 120, orbitSpeed: 0.00025, orbitAngle: 0.9,
    orbitInclination: 0, axialTilt: 0.26, rotationSpeed: 0.0008, isGasGiant: false,
    colorMap:        '/textures/aerial_beach_01_diff_1k.jpg',
    normalMap:       '/textures/aerial_beach_01_nor_gl_1k.png',
    displacementMap: '/textures/aerial_beach_01_disp_1k.png', displacementScale: 0.25,
    roughnessMap:    '/textures/aerial_beach_01_rough_1k.jpg',
    atmosphereColor: new THREE.Color(0x4A90D9), atmosphereIntensity: 0.85,
    labelColor: '#4A90D9', scanRadius: 35,
  },
  {
    name: 'SYNTHEX', bodyKey: 'SYNTHEX',
    radius: 10, orbitRadius: 185, orbitSpeed: 0.00018, orbitAngle: 2.4,
    orbitInclination: 0, axialTilt: 0.45, rotationSpeed: 0.0012, isGasGiant: true,
    hasRing: true,
    colorMap:        '/textures/mossy_rock_diff_1k.jpg',
    normalMap:       '/textures/mossy_rock_nor_gl_1k.png',
    displacementMap: null,
    roughnessMap:    '/textures/mossy_rock_rough_1k.png',
    atmosphereColor: new THREE.Color(0x9B59B6), atmosphereIntensity: 0.75,
    labelColor: '#9B59B6', scanRadius: 40,
    // Skills — 4 moons, orbiting clear of the ring (outer edge = radius*2.2 = 22).
    moons: [
      { name: 'LANG',  label: 'Languages',    radius: 1.8, orbitRadius: 28, orbitSpeed: 0.0016, orbitAngle: 0.0, color: 0xC39BD3, labelColor: '#C39BD3' },
      { name: 'AIML',  label: 'AI / ML',      radius: 1.8, orbitRadius: 34, orbitSpeed: 0.0012, orbitAngle: 1.6, color: 0xBB8FCE, labelColor: '#C39BD3' },
      { name: 'WEB',   label: 'Web & Backend', radius: 1.8, orbitRadius: 40, orbitSpeed: 0.0009, orbitAngle: 3.1, color: 0xA569BD, labelColor: '#C39BD3' },
      { name: 'TOOLS', label: 'Tools & Infra', radius: 1.8, orbitRadius: 46, orbitSpeed: 0.0007, orbitAngle: 4.6, color: 0xD2B4DE, labelColor: '#C39BD3' },
    ],
  },
  {
    name: 'ACADEMY', bodyKey: 'ACADEMY',
    radius: 6, orbitRadius: 290, orbitSpeed: 0.00018, orbitAngle: 5.1,
    orbitInclination: 0.14, axialTilt: 0.18, rotationSpeed: 0.0007, isGasGiant: false,
    colorMap:        '/textures/rocks_ground_04_diff_1k.jpg',
    normalMap:       '/textures/rocks_ground_04_nor_gl_1k.png',
    displacementMap: '/textures/rocks_ground_04_disp_1k.png', displacementScale: 0.2,
    roughnessMap:    '/textures/rocks_ground_04_rough_1k.jpg',
    atmosphereColor: new THREE.Color(0x27AE60), atmosphereIntensity: 0.8,
    labelColor: '#27AE60', scanRadius: 35,
    // Education — 1 moon (single institution).
    moons: [
      { name: 'EDU_1', label: 'Institution I', radius: 1.6, orbitRadius: 14, orbitSpeed: 0.0012, orbitAngle: 0.5, color: 0x7DCEA0, labelColor: '#7DCEA0' },
    ],
  },
  {
    name: 'EXPEDITION', bodyKey: 'EXPEDITION',
    radius: 7, orbitRadius: 375, orbitSpeed: 0.00012, orbitAngle: 1.2,
    orbitInclination: -0.1, axialTilt: 0.35, rotationSpeed: 0.0009, isGasGiant: false,
    colorMap:        '/textures/red_laterite_soil_stones_diff_1k.jpg',
    normalMap:       '/textures/red_laterite_soil_stones_nor_gl_1k.png',
    displacementMap: '/textures/red_laterite_soil_stones_disp_1k.png', displacementScale: 0.3,
    roughnessMap:    '/textures/red_laterite_soil_stones_rough_1k.png',
    atmosphereColor: new THREE.Color(0xE67E22), atmosphereIntensity: 0.7,
    labelColor: '#E67E22', scanRadius: 35,
    // Experience — 1 moon (single role).
    moons: [
      { name: 'EXP_1', label: 'Company I', radius: 1.6, orbitRadius: 15, orbitSpeed: 0.0013, orbitAngle: 0.2, color: 0xEDBB99, labelColor: '#E59866' },
    ],
  },
  {
    name: 'CODEX', bodyKey: 'CODEX',
    radius: 14, orbitRadius: 460, orbitSpeed: 0.00009, orbitAngle: 3.8,
    orbitInclination: 0, axialTilt: 0.22, rotationSpeed: 0.0006, isGasGiant: false,
    colorMap:        '/textures/rock_embedded_concrete_wall_diff_1k.jpg',
    normalMap:       '/textures/rock_embedded_concrete_wall_nor_gl_1k.png',
    displacementMap: '/textures/rock_embedded_concrete_wall_disp_1k.png', displacementScale: 0.28,
    roughnessMap:    '/textures/rock_embedded_concrete_wall_rough_1k.png',
    atmosphereColor: new THREE.Color(0x1A9888), atmosphereIntensity: 0.9,
    labelColor: '#48C9B0', scanRadius: 50,
    // Projects — 5 moons, the widest spread (parent radius 14, so inner moon clears the surface).
    moons: [
      { name: 'PROJ_1', label: 'Project I',   radius: 1.9, orbitRadius: 22, orbitSpeed: 0.0013, orbitAngle: 0.0, color: 0x7FD8C8, labelColor: '#48C9B0' },
      { name: 'PROJ_2', label: 'Project II',  radius: 1.9, orbitRadius: 28, orbitSpeed: 0.0011, orbitAngle: 1.3, color: 0x58D0B8, labelColor: '#48C9B0' },
      { name: 'PROJ_3', label: 'Project III', radius: 1.9, orbitRadius: 34, orbitSpeed: 0.0009, orbitAngle: 2.6, color: 0x48C9B0, labelColor: '#48C9B0' },
      { name: 'PROJ_4', label: 'Project IV',  radius: 1.9, orbitRadius: 40, orbitSpeed: 0.0007, orbitAngle: 3.9, color: 0x76D7C4, labelColor: '#48C9B0' },
      { name: 'PROJ_5', label: 'Project V',   radius: 1.9, orbitRadius: 46, orbitSpeed: 0.0006, orbitAngle: 5.2, color: 0xA3E4D7, labelColor: '#48C9B0' },
    ],
  },
]

// NOVARA station — Contact. Rides the same orbit ring as CODEX (460) but offset
// by angle and inclined, so they never meet. `radius` is the normalized model
// bounding radius — the scan camera and label height key off it.
export const STATION_CONFIG = {
  name: 'NOVARA', bodyKey: 'NOVARA',
  radius: 12, orbitRadius: 460, orbitSpeed: 0.00009, orbitAngle: 0.6,
  orbitInclination: 0.21,
  scanRadius: 35, labelColor: '#A8B2BC',
}
