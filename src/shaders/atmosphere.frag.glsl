uniform vec3 atmosphereColor;
uniform float atmosphereIntensity;
uniform float emissiveBoost;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Sharper power tucks the glow into a thin limb at the planet's edge instead of
  // a wide halo, so worlds read as lit spheres with an atmospheric rim — not as
  // self-luminous stars. emissiveBoost (proximity highlight) is added subtly.
  float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
  rim = pow(rim, 3.6);
  float alpha = rim * atmosphereIntensity;
  gl_FragColor = vec4(atmosphereColor + vec3(emissiveBoost), alpha);
}
