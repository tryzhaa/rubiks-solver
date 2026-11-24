import { describe, expect, test } from 'vitest'
import { formatMoves } from '@/cube/moves'
import { SOLVED, applyMoves, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { crossDone, daisyDone, firstLayerDone } from '../goals'
import { StepBuilder } from '../step'
import { cross, daisy, hold, whiteCorners } from './firstLayer'

const states = Array.from({ length: 300 }, (_, i) => applyMoves(SOLVED, scramble(25, mulberry32(i + 1))))

describe('first layer', () => {
  test('hold is always z2', () => {
    const b = new StepBuilder(states[0])
    hold(b)
    expect(b.steps.map((s) => formatMoves(s.moves))).toEqual(['z2'])
  })

  test.each(states.map((s, i) => [i, s]))('scramble %i: daisy, cross, white corners', (_, s) => {
    const b = new StepBuilder(s as string)
    hold(b)
    daisy(b)
    expect(daisyDone(b.state) || crossDone(b.state)).toBe(true)
    cross(b)
    expect(crossDone(b.state)).toBe(true)
    whiteCorners(b)
    expect(firstLayerDone(b.state)).toBe(true)
    for (const step of b.steps) expect(step.moves.length).toBeGreaterThan(0)
    for (const step of b.steps.filter((st) => st.stage === 'corners')) {
      expect(formatMoves(step.algorithm)).toBe("R U R' U'")
      expect(step.repeat).toBeGreaterThanOrEqual(1)
      expect(step.repeat).toBeLessThanOrEqual(5)
    }
  })

  // Rule: daisy and cross both do nothing when crossDone already holds.
  test('a solved cube gets only the hold step through the cross', () => {
    const b = new StepBuilder(SOLVED)
    hold(b)
    daisy(b)
    cross(b)
    expect(b.steps.map((s) => s.stage)).toEqual(['hold'])
  })
})
