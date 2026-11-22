'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

export const HORIZON_COLOR = 0xd4ecff
export const SUN_POSITION = new THREE.Vector3(9, 16, 7)

const VERTEX = `
varying vec3 v;
void main() {
  v = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const FRAGMENT = `
uniform vec3 top;
uniform vec3 hor;
uniform vec3 sunDir;
varying vec3 v;
void main() {
  float h = clamp(v.y, 0.0, 1.0);
  vec3 c = mix(hor, top, pow(h, 0.5));
  float s = max(dot(v, sunDir), 0.0);
  c += vec3(1.0, 0.9, 0.6) * (pow(s, 600.0) * 3.0 + pow(s, 8.0) * 0.25);
  gl_FragColor = vec4(c, 1.0);
}`

/** Gradient sky dome with a soft sun glow. */
export function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(0x2a82ea) },
          hor: { value: new THREE.Color(HORIZON_COLOR) },
          sunDir: { value: SUN_POSITION.clone().normalize() },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[150, 24, 16]} />
    </mesh>
  )
}
