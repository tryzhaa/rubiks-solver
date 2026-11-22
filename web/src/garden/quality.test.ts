import { describe, expect, test } from 'vitest'
import { countsFor, detectTier } from './quality'

describe('countsFor', () => {
  test('high tier uses the approved prototype counts', () => {
    expect(countsFor('high')).toEqual({
      grass: 24000,
      butterflies: 7,
      flowers: { daisy: 650, spike: 280, sunflower: 45, puff: 130 },
    })
  })

  test('low tier scales flowers by 0.4 and cuts grass and butterflies', () => {
    expect(countsFor('low')).toEqual({
      grass: 6000,
      butterflies: 4,
      flowers: { daisy: 260, spike: 112, sunflower: 18, puff: 52 },
    })
  })
})

describe('detectTier', () => {
  test('mobile with 4 cores is low', () => {
    expect(detectTier({ isMobile: true, hardwareConcurrency: 4, deviceMemory: 8 })).toBe('low')
  })

  test('mobile with 4 GB or less memory is low', () => {
    expect(detectTier({ isMobile: true, hardwareConcurrency: 8, deviceMemory: 4 })).toBe('low')
  })

  test('capable mobile is high', () => {
    expect(detectTier({ isMobile: true, hardwareConcurrency: 8, deviceMemory: 8 })).toBe('high')
  })

  test('desktop is high even with few cores', () => {
    expect(detectTier({ isMobile: false, hardwareConcurrency: 2, deviceMemory: 2 })).toBe('high')
  })

  test('mobile with unknown specs is high', () => {
    expect(detectTier({ isMobile: true })).toBe('high')
  })
})
