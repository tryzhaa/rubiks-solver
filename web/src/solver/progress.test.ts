import { describe, expect, test } from 'vitest'
import { SOLVED, applyMoves, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { FINISHED_TITLE, FINISHED_WHY, bannerFor, stepAt } from './progress'
import { solve } from './solve'

const { steps, moves } = solve(applyMoves(SOLVED, scramble(20, mulberry32(1))))

describe('stepAt', () => {
  test('move 0 is in the first step; the last move is in the last step', () => {
    expect(stepAt(steps, 0)?.stepIndex).toBe(0)
    expect(stepAt(steps, moves.length - 1)?.stepIndex).toBe(steps.length - 1)
  })

  test('the first move of step k maps to step k', () => {
    let start = 0
    steps.forEach((st, k) => {
      expect(stepAt(steps, start)?.stepIndex).toBe(k)
      start += st.moves.length
    })
  })

  test('finished and out-of-range indices give null; negative clamps to 0', () => {
    expect(stepAt(steps, moves.length)).toBeNull()
    expect(stepAt(steps, moves.length + 5)).toBeNull()
    expect(stepAt(steps, -1)?.stepIndex).toBe(0)
  })
})

describe('bannerFor', () => {
  test('names the stage and case, with the algorithm and why', () => {
    expect(bannerFor(steps, 0)).toEqual({
      title: 'Hold the cube: Upside down',
      algorithm: 'z2',
      setup: '',
      why: steps[0].why,
    })
  })

  test('shows the setup and a repeat count', () => {
    const k = steps.findIndex((s) => s.repeat > 1 && s.setup.length > 0)
    const start = steps.slice(0, k).reduce((n, s) => n + s.moves.length, 0)
    const banner = bannerFor(steps, start)
    expect(banner.algorithm).toMatch(/ ×\d$/)
    expect(banner.setup).not.toBe('')
  })

  test('the finished banner says Solved!', () => {
    expect(bannerFor(steps, moves.length)).toEqual({ title: FINISHED_TITLE, algorithm: '', setup: '', why: FINISHED_WHY })
    expect(FINISHED_TITLE).toBe('Solved!')
    expect(FINISHED_WHY).toBe('Every face is one colour again. Press New scramble to try another.')
  })
})
