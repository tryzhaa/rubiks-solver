import * as THREE from 'three'
import { describe, expect, test } from 'vitest'
import { applyWind, windOffset } from './wind'

describe('windOffset', () => {
  test('zero height does not move', () => {
    const [dx, dz] = windOffset(3, -2, 0, 5, 0.1)
    expect(dx).toBeCloseTo(0, 10)
    expect(dz).toBeCloseTo(0, 10)
  })

  test('amp 0 does not move', () => {
    const [dx, dz] = windOffset(3, -2, 2, 5, 0)
    expect(dx).toBeCloseTo(0, 10)
    expect(dz).toBeCloseTo(0, 10)
  })

  test('taller plants move more', () => {
    const low = Math.hypot(...windOffset(1, 1, 0.5, 4, 0.1))
    const high = Math.hypot(...windOffset(1, 1, 2, 4, 0.1))
    expect(high).toBeGreaterThan(low)
  })

  test('is deterministic', () => {
    expect(windOffset(2, 3, 1.5, 7.7, 0.1)).toEqual(windOffset(2, 3, 1.5, 7.7, 0.1))
  })

  test('stays under 1 unit at height 2, amp 0.1, for all times', () => {
    for (let t = 0; t <= 100; t += 0.25) {
      expect(Math.hypot(...windOffset(-4, 6, 2, t, 0.1))).toBeLessThan(1)
    }
  })

  test('leans downwind (positive x) on average', () => {
    let sum = 0
    for (let t = 0; t < 100; t += 0.25) sum += windOffset(0, 0, 2, t, 0.1)[0]
    expect(sum).toBeGreaterThan(0)
  })
})

describe('applyWind', () => {
  const uniforms = { uTime: { value: 0 }, uStrength: { value: 1 } }
  const fakeShader = () => ({
    uniforms: {} as Record<string, unknown>,
    vertexShader: '#include <common>\nvoid main(){\n#include <project_vertex>\n}',
  })

  test('patches the vertex shader and shares the uniforms', () => {
    const m = new THREE.MeshStandardMaterial()
    applyWind(m, 0.1, uniforms)
    const shader = fakeShader()
    m.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
    expect(shader.vertexShader).toContain('uniform float uTime')
    expect(shader.vertexShader).toContain('uniform float uStrength')
    expect(shader.vertexShader).toContain('instanceMatrix')
    expect(shader.vertexShader).not.toContain('#include <project_vertex>')
    expect(shader.uniforms.uTime).toBe(uniforms.uTime)
    expect(shader.uniforms.uStrength).toBe(uniforms.uStrength)
  })

  test('different amplitudes get different program cache keys', () => {
    const a = new THREE.MeshStandardMaterial()
    const b = new THREE.MeshStandardMaterial()
    applyWind(a, 0.1, uniforms)
    applyWind(b, 0.3, uniforms)
    expect(a.customProgramCacheKey()).not.toBe(b.customProgramCacheKey())
  })
})
