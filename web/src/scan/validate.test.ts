import { describe, expect, test } from 'vitest'
import type { Face } from '@/cube/moves'
import { SOLVED, applyMoves, faceletIndex, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { type EdgeSlot, slotFaces } from '@/solver/pieces'
import { validateState } from './validate'

function swap(s: string, i: number, j: number): string {
  const chars = s.split('')
  ;[chars[i], chars[j]] = [chars[j], chars[i]]
  return chars.join('')
}

function set(s: string, i: number, letter: string): string {
  return s.slice(0, i) + letter + s.slice(i + 1)
}

/** Moves the sticker at a to b, b to c and c to a. */
function cycle(s: string, a: number, b: number, c: number): string {
  const chars = s.split('')
  ;[chars[b], chars[c], chars[a]] = [s[a], s[b], s[c]]
  return chars.join('')
}

const VEC: Record<Face, [number, number, number]> = {
  R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1],
}
function slotPos(slot: string): [number, number, number] {
  const pos: [number, number, number] = [0, 0, 0]
  for (const f of slot.split('') as Face[]) VEC[f].forEach((v, i) => (pos[i] += v))
  return pos
}

describe('validateState', () => {
  test('solved and 1000 scrambles are valid', () => {
    expect(validateState(SOLVED)).toEqual({ ok: true })
    for (let i = 0; i < 1000; i++)
      expect(validateState(applyMoves(SOLVED, scramble(25, mulberry32(i + 1))))).toEqual({ ok: true })
  })

  test.each([
    ['length', SOLVED.slice(1)],
    ['centres', swap(SOLVED, 4, 13)],
    ['count', set(SOLVED, 0, 'R')],
    ['pieces', set(set(SOLVED, 8, 'D'), 35, 'U')], // two corners become copies of other corners
    ['twist', cycle(SOLVED, 8, 9, 20)],
    ['flip', swap(SOLVED, 7, 19)],
    ['parity', swap(swap(SOLVED, 7, 5), 19, 10)], // UF and UR edges exchanged
  ] as const)('%s problem is found', (problem, s) => {
    const v = validateState(s)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.problem).toBe(problem)
  })

  test('the problems also show up on scrambled cubes', () => {
    const s = applyMoves(SOLVED, scramble(25, mulberry32(77)))
    const flippedAt = (state: string, slot: EdgeSlot) => {
      const [a, b] = slotFaces(slot).map((f) => faceletIndex(f, slotPos(slot)))
      return swap(state, a, b)
    }
    expect(validateState(flippedAt(s, 'FR'))).toMatchObject({ ok: false, problem: 'flip' })
  })

  test('count message names the colours', () => {
    const v = validateState(set(SOLVED, 0, 'R'))
    expect(v).toMatchObject({ ok: false, message: 'Each colour should appear 9 times. Too many: red (10). Too few: white (8).' })
    if (!v.ok) expect(v.stickers).toContain(0)
  })

  test('pieces problem marks the stickers of the bad corner', () => {
    const v = validateState(set(set(SOLVED, 8, 'D'), 35, 'U'))
    if (v.ok) throw new Error('expected a problem')
    expect(v.stickers).toEqual(expect.arrayContaining([8, 9, 20]))
  })
})
