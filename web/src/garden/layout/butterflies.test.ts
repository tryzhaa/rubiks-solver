import { describe, expect, test } from 'vitest'
import { butterflyHeading, butterflyPosition, generateButterflies } from './butterflies'

const KINDS = ['monarch', 'admiral', 'swallow', 'blue']

describe('generateButterflies', () => {
  test('returns the requested count with exactly one hint butterfly, first and larger', () => {
    const bs = generateButterflies(7, 1)
    expect(bs).toHaveLength(7)
    expect(bs.filter((b) => b.isHint)).toHaveLength(1)
    expect(bs[0].isHint).toBe(true)
    expect(bs[0].scale).toBe(1.9)
  })

  test('zero count gives none', () => {
    expect(generateButterflies(0, 1)).toEqual([])
  })

  test('only uses the four painted kinds', () => {
    generateButterflies(12, 3).forEach((b) => expect(KINDS).toContain(b.kind))
  })

  test('is deterministic per seed', () => {
    expect(generateButterflies(5, 9)).toEqual(generateButterflies(5, 9))
    expect(generateButterflies(5, 9)).not.toEqual(generateButterflies(5, 10))
  })
})

describe('flight', () => {
  const bs = generateButterflies(10, 4)

  test('stays between 0.3 and 6.5 units high over a long flight', () => {
    bs.forEach((b) => {
      for (let t = 0; t <= 200; t += 0.5) {
        const y = butterflyPosition(b, t)[1]
        expect(y).toBeGreaterThanOrEqual(0.3)
        expect(y).toBeLessThanOrEqual(6.5)
      }
    })
  })

  test('position is continuous', () => {
    bs.forEach((b) => {
      for (let t = 0; t <= 100; t += 0.5) {
        const p = butterflyPosition(b, t)
        const q = butterflyPosition(b, t + 0.05)
        expect(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])).toBeLessThan(1)
      }
    })
  })

  test('heading is always finite', () => {
    bs.forEach((b) => {
      for (let t = 0; t <= 100; t += 0.5) expect(Number.isFinite(butterflyHeading(b, t))).toBe(true)
    })
  })

  test('heading faces the direction of motion', () => {
    const b = bs[0]
    const p = butterflyPosition(b, 10)
    const q = butterflyPosition(b, 10.05)
    const yaw = butterflyHeading(b, 10)
    // A butterfly's forward axis is -z; rotating by yaw about y gives (-sin yaw, -cos yaw).
    const dx = q[0] - p[0]
    const dz = q[2] - p[2]
    const len = Math.hypot(dx, dz)
    expect(-Math.sin(yaw)).toBeCloseTo(dx / len, 5)
    expect(-Math.cos(yaw)).toBeCloseTo(dz / len, 5)
  })
})
