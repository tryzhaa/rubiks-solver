import { describe, expect, test } from 'vitest'
import { BASE_FOV, MAX_FOV, fovForAspect } from './framing'

const horizontalHalfTan = (fov: number, aspect: number) => Math.tan(((fov / 2) * Math.PI) / 180) * aspect

describe('fovForAspect', () => {
  test('keeps the base field of view on landscape and square screens', () => {
    expect(fovForAspect(16 / 9)).toBe(BASE_FOV)
    expect(fovForAspect(1)).toBe(BASE_FOV)
  })

  test('widens on portrait so the sideways view matches a square screen', () => {
    const aspect = 0.8
    expect(horizontalHalfTan(fovForAspect(aspect), aspect)).toBeCloseTo(horizontalHalfTan(BASE_FOV, 1), 6)
  })

  test('never goes past the maximum on very tall phones', () => {
    expect(fovForAspect(390 / 844)).toBe(MAX_FOV)
    expect(fovForAspect(0.2)).toBe(MAX_FOV)
  })

  test('falls back to the base value for a zero or invalid aspect', () => {
    expect(fovForAspect(0)).toBe(BASE_FOV)
    expect(fovForAspect(Number.NaN)).toBe(BASE_FOV)
  })
})
