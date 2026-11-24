import { describe, expect, test } from 'vitest'
import { cubiePosition, poseAfter } from '@/cube/pose'
import { SOLVED, applyMoves, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { allFacesSolved } from './goals'
import { solve } from './solve'
import { startMovesFor } from './startMoves'

describe('startMovesFor', () => {
  test.each(Array.from({ length: 100 }, (_, i) => i))('scramble %i: start moves rebuild the state', (i) => {
    const s = applyMoves(SOLVED, scramble(25, mulberry32(4000 + i)))
    const { moves } = solve(s)
    const start = startMovesFor(s, moves)
    expect(applyMoves(SOLVED, start)).toBe(s)
    expect(allFacesSolved(applyMoves(SOLVED, [...start, ...moves]))).toBe(true)
  })

  test('the viewer pose after the start moves shows the state (white up, green front)', () => {
    const s = applyMoves(SOLVED, scramble(25, mulberry32(9)))
    const start = startMovesFor(s, solve(s).moves)
    const whiteCentre = poseAfter(start).find((c) => c.home.join() === '0,1,0')!
    expect(cubiePosition(whiteCentre)).toEqual([0, 1, 0])
  })
})
