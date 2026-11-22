import { describe, expect, test } from 'vitest'
import { type Face } from './moves'
import { cubieInLayer, layerTurn } from './layers'

describe('layerTurn', () => {
  test.each<[Face, 'x' | 'y' | 'z', -1 | 1, number]>([
    ['R', 'x', 1, -1],
    ['L', 'x', -1, 1],
    ['U', 'y', 1, -1],
    ['D', 'y', -1, 1],
    ['F', 'z', 1, -1],
    ['B', 'z', -1, 1],
  ])('%s clockwise quarter turn', (face, axis, layer, quarterTurns) => {
    expect(layerTurn({ face, turns: 1 })).toEqual({ axis, layer, quarterTurns })
  })

  test('counter-clockwise negates and half turn doubles', () => {
    expect(layerTurn({ face: 'R', turns: 3 }).quarterTurns).toBe(1)
    expect(layerTurn({ face: 'R', turns: 2 }).quarterTurns).toBe(-2)
    expect(layerTurn({ face: 'L', turns: 2 }).quarterTurns).toBe(2)
  })
})

describe('cubieInLayer', () => {
  test('selects cubies on the turning layer only', () => {
    const r = layerTurn({ face: 'R', turns: 1 })
    expect(cubieInLayer([1, 0, -1], r)).toBe(true)
    expect(cubieInLayer([0, 0, 0], r)).toBe(false)
    expect(cubieInLayer([-1, 1, 1], r)).toBe(false)
  })

  test('exactly 9 of the 27 positions match every face turn', () => {
    const positions: [number, number, number][] = []
    for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) positions.push([x, y, z])
    for (const face of ['U', 'D', 'L', 'R', 'F', 'B'] as Face[]) {
      const t = layerTurn({ face, turns: 1 })
      expect(positions.filter((p) => cubieInLayer(p, t))).toHaveLength(9)
    }
  })
})
