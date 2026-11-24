import { describe, expect, test } from 'vitest'
import { SOLVED, applyMoves, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { allFacesSolved } from './goals'
import { UnsolvableError, solve } from './solve'

const states = Array.from({ length: 1000 }, (_, i) => applyMoves(SOLVED, scramble(25, mulberry32(1000 + i))))

function swap(s: string, i: number, j: number): string {
  const chars = s.split('')
  ;[chars[i], chars[j]] = [chars[j], chars[i]]
  return chars.join('')
}

/** Moves the sticker at a to b, b to c and c to a. */
function cycle(s: string, a: number, b: number, c: number): string {
  const chars = s.split('')
  ;[chars[b], chars[c], chars[a]] = [s[a], s[b], s[c]]
  return chars.join('')
}

/** Exchanges two edges, each keeping its own orientation. */
function swapEdges(s: string, [a1, a2]: [number, number], [b1, b2]: [number, number]): string {
  return swap(swap(s, a1, b1), a2, b2)
}

describe('solve', () => {
  test('solves 1000 random scrambles; every step replays exactly', () => {
    let total = 0
    for (const s of states) {
      const { steps, moves } = solve(s)
      expect(allFacesSolved(applyMoves(s, moves))).toBe(true)
      expect(moves).toEqual(steps.flatMap((st) => st.moves))
      for (const st of steps)
        expect(st.moves).toEqual([...st.setup, ...Array.from({ length: st.repeat }, () => st.algorithm).flat()])
      expect(moves.length).toBeLessThan(400)
      total += moves.length
    }
    expect(total / states.length).toBeLessThan(200)
  })

  test('stages come in method order', () => {
    const order = [
      'hold',
      'daisy',
      'cross',
      'corners',
      'middle',
      'yellowCross',
      'yellowEdges',
      'placeCorners',
      'twistCorners',
      'finish',
    ]
    for (const s of states.slice(0, 50)) {
      const seen = solve(s).steps.map((st) => order.indexOf(st.stage))
      expect(seen).toEqual([...seen].sort((a, b) => a - b))
    }
  })

  test('a solved cube needs only the hold step', () => {
    expect(solve(SOLVED).steps.map((s) => s.stage)).toEqual(['hold'])
  })

  test.each([
    ['one flipped edge', swap(SOLVED, 7, 19)],
    ['one twisted corner', cycle(SOLVED, 8, 9, 20)],
    ['two swapped edges', swapEdges(SOLVED, [7, 19], [5, 10])],
    ['wrong length', SOLVED.slice(1)],
    ['bad colour count', 'U' + SOLVED.slice(1, 53) + 'U'],
    ['centre off home', swap(SOLVED, 4, 13)],
  ])('%s throws UnsolvableError', (_, s) => {
    expect(() => solve(s)).toThrow(UnsolvableError)
  })
})
