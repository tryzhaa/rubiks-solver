import { Vector3 } from 'three'
import { describe, expect, test } from 'vitest'
import { roundedBoxGeometry, stickerGeometry } from './cubeGeometry'

describe('roundedBoxGeometry', () => {
  const g = roundedBoxGeometry(0.97, 0.1, 14)
  g.computeBoundingBox()
  const size = g.boundingBox!.getSize(new Vector3())

  test('has the requested overall size', () => {
    expect(size.x).toBeCloseTo(0.97, 5)
    expect(size.y).toBeCloseTo(0.97, 5)
    expect(size.z).toBeCloseTo(0.97, 5)
  })

  test('all vertices and normals are finite', () => {
    expect(Array.from(g.getAttribute('position').array).every(Number.isFinite)).toBe(true)
    expect(Array.from(g.getAttribute('normal').array).every(Number.isFinite)).toBe(true)
  })

  test('corners are rounded: no vertex sits on the sharp corner', () => {
    const pos = g.getAttribute('position')
    const half = 0.97 / 2
    let nearest = Infinity
    for (let i = 0; i < pos.count; i++) {
      nearest = Math.min(nearest, Math.hypot(half - Math.abs(pos.getX(i)), half - Math.abs(pos.getY(i)), half - Math.abs(pos.getZ(i))))
    }
    expect(nearest).toBeGreaterThan(0.03)
  })

  test('radius 0.1 is smaller than a bigger radius (rounding is adjustable)', () => {
    const rounder = roundedBoxGeometry(0.97, 0.2, 14).getAttribute('position')
    const pos = g.getAttribute('position')
    const corner = (p: typeof pos) => {
      let m = Infinity
      for (let i = 0; i < p.count; i++) m = Math.min(m, Math.hypot(0.485 - Math.abs(p.getX(i)), 0.485 - Math.abs(p.getY(i)), 0.485 - Math.abs(p.getZ(i))))
      return m
    }
    expect(corner(rounder)).toBeGreaterThan(corner(pos))
  })
})

describe('stickerGeometry', () => {
  test('is a thin, centred, finite shape sitting just outside the cubie body', () => {
    const g = stickerGeometry()
    g.computeBoundingBox()
    const box = g.boundingBox!
    expect(Array.from(g.getAttribute('position').array).every(Number.isFinite)).toBe(true)
    expect(box.min.z).toBeGreaterThan(0.44)
    expect(box.max.z).toBeLessThan(0.52)
    expect(box.max.x - box.min.x).toBeLessThan(0.82)
    expect(box.max.x + box.min.x).toBeCloseTo(0, 5)
  })
})
