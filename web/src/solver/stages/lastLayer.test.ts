import { describe, expect, test } from 'vitest'
import { SOLVED, applyMove, applyMoves, faceletIndex, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { yellowCrossDone, yellowEdgesDone } from '../goals'
import { StepBuilder, UnsolvableError } from '../step'
import { cross, daisy, hold, whiteCorners } from './firstLayer'
import { yellowCross, yellowEdges } from './lastLayer'
import { middleLayer } from './middleLayer'

const states = Array.from({ length: 300 }, (_, i) => applyMoves(SOLVED, scramble(25, mulberry32(i + 1))))

function swap(s: string, i: number, j: number): string {
  const chars = s.split('')
  ;[chars[i], chars[j]] = [chars[j], chars[i]]
  return chars.join('')
}

function throughMiddle(s: string): StepBuilder {
  const b = new StepBuilder(s)
  hold(b)
  daisy(b)
  cross(b)
  whiteCorners(b)
  middleLayer(b)
  return b
}

describe('last layer', () => {
  test.each(states.map((s, i) => [i, s]))('scramble %i: yellow cross, then yellow edges', (_, s) => {
    const b = throughMiddle(s as string)
    yellowCross(b)
    expect(yellowCrossDone(b.state)).toBe(true)
    yellowEdges(b)
    expect(yellowEdgesDone(b.state)).toBe(true)
  })

  test('one flipped top edge throws UnsolvableError', () => {
    const z2 = applyMove(SOLVED, { face: 'z', turns: 2 })
    const flipped = swap(z2, faceletIndex('U', [0, 1, 1]), faceletIndex('F', [0, 1, 1]))
    const b = new StepBuilder(flipped)
    expect(() => yellowCross(b)).toThrow(UnsolvableError)
  })
})
