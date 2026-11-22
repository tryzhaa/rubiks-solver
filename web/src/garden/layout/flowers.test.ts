import { describe, expect, test } from 'vitest'
import { FLOWER_SPECS, type FlowerKind, generateFlowers } from './flowers'
import { mulberry32 } from './random'

const COUNTS: Record<FlowerKind, number> = { daisy: 40, spike: 20, sunflower: 5, puff: 10 }
const KINDS = Object.keys(COUNTS) as FlowerKind[]

describe('mulberry32', () => {
  test('is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(5)
    const b = mulberry32(5)
    for (let i = 0; i < 100; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('generateFlowers', () => {
  const flowers = generateFlowers(COUNTS, 1)

  test('returns exactly the requested count per kind', () => {
    KINDS.forEach((k) => expect(flowers.filter((f) => f.kind === k)).toHaveLength(COUNTS[k]))
  })

  test('heights stay within each kind range', () => {
    flowers.forEach((f) => {
      const [lo, hi] = FLOWER_SPECS[f.kind].height
      expect(f.height).toBeGreaterThanOrEqual(lo)
      expect(f.height).toBeLessThanOrEqual(hi)
    })
  })

  test('every flower is inside the meadow radius of 27', () => {
    flowers.forEach((f) => expect(Math.hypot(f.x, f.z)).toBeLessThanOrEqual(27))
  })

  test('colorIndex is always a valid palette index', () => {
    flowers.forEach((f) => {
      expect(Number.isInteger(f.colorIndex)).toBe(true)
      expect(f.colorIndex).toBeGreaterThanOrEqual(0)
      expect(f.colorIndex).toBeLessThan(FLOWER_SPECS[f.kind].palette.length)
    })
  })

  test('same seed gives identical output and a different seed differs', () => {
    expect(generateFlowers(COUNTS, 1)).toEqual(flowers)
    expect(generateFlowers(COUNTS, 2)).not.toEqual(flowers)
  })

  test('zero counts give no flowers', () => {
    expect(generateFlowers({ daisy: 0, spike: 0, sunflower: 0, puff: 0 }, 1)).toEqual([])
  })
})

describe('FLOWER_SPECS', () => {
  test('heights match the approved ranges', () => {
    expect(FLOWER_SPECS.daisy.height).toEqual([0.8, 1.9])
    expect(FLOWER_SPECS.spike.height).toEqual([1.0, 2.2])
    expect(FLOWER_SPECS.sunflower.height).toEqual([1.7, 2.5])
    expect(FLOWER_SPECS.puff.height).toEqual([0.5, 1.1])
  })
})
