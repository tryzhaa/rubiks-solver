import { describe, expect, test } from 'vitest'
import { colourDistance, rgbToLab } from './colour'

describe('colour', () => {
  test('white is L≈100, a≈0, b≈0 and black is L=0', () => {
    const [l, a, b] = rgbToLab([255, 255, 255])
    expect(l).toBeCloseTo(100, 0)
    expect(Math.abs(a)).toBeLessThan(0.5)
    expect(Math.abs(b)).toBeLessThan(0.5)
    expect(rgbToLab([0, 0, 0])[0]).toBeCloseTo(0, 5)
  })

  test('red is closer to orange than to blue', () => {
    expect(colourDistance([190, 30, 40], [240, 110, 30])).toBeLessThan(colourDistance([190, 30, 40], [20, 70, 190]))
  })
})
