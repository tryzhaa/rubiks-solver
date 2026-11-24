import { describe, expect, test } from 'vitest'
import { formatMoves } from '@/cube/moves'
import { SOLVED, applyMoves, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { middleDone } from '../goals'
import { StepBuilder } from '../step'
import { cross, daisy, hold, whiteCorners } from './firstLayer'
import { middleLayer } from './middleLayer'

const states = Array.from({ length: 300 }, (_, i) => applyMoves(SOLVED, scramble(25, mulberry32(i + 1))))
const INSERTS = ["U R U' R' U' F' U F", "U' L' U L U F U' F'"]

describe('middle layer', () => {
  test.each(states.map((s, i) => [i, s]))('scramble %i: middle layer solved with the two inserts', (_, s) => {
    const b = new StepBuilder(s as string)
    hold(b)
    daisy(b)
    cross(b)
    whiteCorners(b)
    middleLayer(b)
    expect(middleDone(b.state)).toBe(true)
    for (const step of b.steps.filter((st) => st.stage === 'middle')) {
      expect(INSERTS).toContain(formatMoves(step.algorithm))
      expect(step.repeat).toBe(1)
    }
  })
})
