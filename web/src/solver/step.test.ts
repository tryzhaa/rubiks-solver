import { describe, expect, test } from 'vitest'
import { formatMoves, parseMoves } from '@/cube/moves'
import { SOLVED, applyMove, applyMoves } from '@/cube/state'
import { StepBuilder, UnsolvableError, turnsUntil } from './step'

describe('StepBuilder', () => {
  test('add records setup + algorithm × repeat as moves and applies them', () => {
    const b = new StepBuilder(SOLVED)
    b.add('corners', 'Corner on top', 'why', parseMoves('y U'), parseMoves("R U R' U'"), 2)
    expect(formatMoves(b.steps[0].moves)).toBe("y U R U R' U' R U R' U'")
    expect(b.state).toBe(applyMoves(SOLVED, b.steps[0].moves))
    expect(b.steps[0].stageName).toBe('White corners')
  })

  test('add skips a step with no moves', () => {
    const b = new StepBuilder(SOLVED)
    b.add('finish', 'Line up the top', 'why', [], [])
    expect(b.steps).toEqual([])
  })
})

describe('turnsUntil', () => {
  test('finds the fewest U turns', () => {
    const s = applyMove(SOLVED, { face: 'U', turns: 1 })
    expect(turnsUntil(s, 'U', (x) => x === SOLVED)).toEqual([{ face: 'U', turns: 3 }])
    expect(turnsUntil(SOLVED, 'U', (x) => x === SOLVED)).toEqual([])
    expect(() => turnsUntil(SOLVED, 'U', () => false)).toThrow(UnsolvableError)
  })
})
