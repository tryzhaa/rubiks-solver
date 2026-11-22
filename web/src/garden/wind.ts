import type * as THREE from 'three'

export interface WindUniforms {
  uTime: { value: number }
  /** 0 disables wind (reduced motion), 1 is full strength. */
  uStrength: { value: number }
}

/**
 * JS twin of the vertex-shader wind in `applyWind`. Returns the (dx, dz) world offset of a point
 * `height` above the ground at (x, z). Gusts roll across the meadow as a travelling wave and every
 * plant leans downwind (+x), more the taller it is.
 */
export function windOffset(x: number, z: number, height: number, t: number, amp: number): [number, number] {
  const h = Math.max(height, 0)
  const ph = (x * 0.75 + z * 0.35) * 0.2 - t * 2.1
  const gust = 0.6 + 0.4 * Math.sin(ph * 0.3 + t * 0.35)
  const k = amp * h * h * gust
  return [
    (Math.sin(ph) * 0.75 + Math.sin(ph * 2.3 + 1) * 0.25) * k + k * 0.7,
    Math.cos(ph * 0.7) * k * 0.35 + k * 0.15,
  ]
}

/** Patches an instanced material so its vertices sway in the wind. Only valid on InstancedMesh. */
export function applyWind(material: THREE.Material, amp: number, uniforms: WindUniforms): void {
  material.customProgramCacheKey = () => `wind-${amp}`
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uStrength = uniforms.uStrength
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uStrength;')
      .replace(
        '#include <project_vertex>',
        `
  vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
  float h = max(mvPosition.y, 0.0);
  float ph = (instanceMatrix[3].x * .75 + instanceMatrix[3].z * .35) * .2 - uTime * 2.1;
  float gust = .6 + .4 * sin(ph * .3 + uTime * .35);
  float k = ${amp.toFixed(4)} * h * h * gust * uStrength;
  mvPosition.x += (sin(ph) * .75 + sin(ph * 2.3 + 1.) * .25) * k + k * .7;
  mvPosition.z += cos(ph * .7) * k * .35 + k * .15;
  mvPosition = modelViewMatrix * mvPosition;
  gl_Position = projectionMatrix * mvPosition;`,
      )
  }
}
