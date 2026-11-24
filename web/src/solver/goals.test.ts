import { describe, expect, test } from 'vitest'
import { parseMoves } from '@/cube/moves'
import { SOLVED, applyMove, applyMoves } from '@/cube/state'
import {
  allFacesSolved,
  cornersPlaced,
  crossDone,
  daisyDone,
  firstLayerDone,
  middleDone,
  yellowCrossDone,
  yellowEdgesDone,
} from './goals'

describe('goals', () => {
  test('every goal holds on a solved cube and after z2', () => {
    for (const s of [SOLVED, applyMove(SOLVED, { face: 'z', turns: 2 })])
      for (const g of [crossDone, firstLayerDone, middleDone, yellowCrossDone, yellowEdgesDone, cornersPlaced, allFacesSolved])
        expect(g(s)).toBe(true)
  })

  test('one R breaks the cross goal, U breaks only the last-layer goals', () => {
    const z2 = applyMove(SOLVED, { face: 'z', turns: 2 })
    expect(crossDone(applyMove(z2, { face: 'R', turns: 1 }))).toBe(false)
    const u = applyMove(z2, { face: 'U', turns: 1 })
    expect(middleDone(u)).toBe(true)
    expect(yellowCrossDone(u)).toBe(true)
    expect(yellowEdgesDone(u)).toBe(false)
  })

  test('daisyDone: four white edges on top around yellow', () => {
    // After z2 white is on D; R2 L2 F2 B2 lifts all four white edges to U with white up.
    const s = applyMoves(SOLVED, parseMoves('z2 R2 L2 F2 B2'))
    expect(daisyDone(s)).toBe(true)
    expect(daisyDone(applyMove(SOLVED, { face: 'z', turns: 2 }))).toBe(false)
  })
})
