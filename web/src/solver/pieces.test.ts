import { describe, expect, test } from 'vitest'
import { SOLVED, applyMove } from '@/cube/state'
import { centre, colourFace, findCorner, findEdge, sticker } from './pieces'

const R = applyMove(SOLVED, { face: 'R', turns: 1 })

describe('pieces', () => {
  test('sticker and centre read the solved cube', () => {
    expect(sticker(SOLVED, 'UF', 'F')).toBe('F')
    expect(sticker(SOLVED, 'DBL', 'L')).toBe('L')
    expect(centre(SOLVED, 'R')).toBe('R')
  })

  test('R moves the UR edge to BR with its white sticker on B', () => {
    expect(findEdge(R, 'R', 'U')).toBe('BR')
    expect(colourFace(R, 'BR', 'U')).toBe('B')
    expect(sticker(R, 'UR', 'U')).toBe('F')
  })

  test('findCorner ignores colour order', () => {
    expect(findCorner(SOLVED, 'R', 'U', 'F')).toBe('UFR')
    expect(findCorner(R, 'U', 'F', 'R')).toBe('UBR')
  })
})
