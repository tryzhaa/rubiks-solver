import { describe, expect, test } from 'vitest'
import { type Face, type Move, parseMoves } from './moves'
import { SOLVED, applyMove, applyMoves, isSolved, scramble } from './state'

const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']

function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('applyMove', () => {
  test('SOLVED is the 54-character Kociemba string', () => {
    expect(SOLVED).toBe('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB')
  })

  test('R on a solved cube matches the known facelet string', () => {
    expect(applyMove(SOLVED, { face: 'R', turns: 1 })).toBe(
      'UUFUUFUUFRRRRRRRRRFFDFFDFFDDDBDDBDDBLLLLLLLLLUBBUBBUBB',
    )
  })

  test('U on a solved cube matches the known facelet string', () => {
    expect(applyMove(SOLVED, { face: 'U', turns: 1 })).toBe(
      ['UUUUUUUUU', 'BBBRRRRRR', 'RRRFFFFFF', 'DDDDDDDDD', 'FFFLLLLLL', 'LLLBBBBBB'].join(''),
    )
  })

  test.each(FACES)('four quarter turns of %s return to solved', (face) => {
    let s = SOLVED
    for (let i = 0; i < 4; i++) s = applyMove(s, { face, turns: 1 })
    expect(s).toBe(SOLVED)
  })

  test.each(FACES)('%s then its inverse returns to solved', (face) => {
    expect(applyMove(applyMove(SOLVED, { face, turns: 1 }), { face, turns: 3 })).toBe(SOLVED)
  })

  test.each(FACES)('%s2 equals two quarter turns', (face) => {
    const twice = applyMove(applyMove(SOLVED, { face, turns: 1 }), { face, turns: 1 })
    expect(applyMove(SOLVED, { face, turns: 2 })).toBe(twice)
  })

  test("(R U R' U') repeated 6 times returns to solved, and not before", () => {
    const sexy = parseMoves("R U R' U'")
    let s = SOLVED
    for (let i = 1; i <= 6; i++) {
      s = applyMoves(s, sexy)
      expect(isSolved(s)).toBe(i === 6)
    }
  })
})

describe('isSolved', () => {
  test('true for SOLVED, false after one move', () => {
    expect(isSolved(SOLVED)).toBe(true)
    expect(isSolved(applyMove(SOLVED, { face: 'R', turns: 1 }))).toBe(false)
  })
})

describe('scramble', () => {
  test('has the requested length and never repeats a face consecutively', () => {
    const ms = scramble(20, seeded(7))
    expect(ms).toHaveLength(20)
    for (let i = 1; i < ms.length; i++) expect(ms[i].face).not.toBe(ms[i - 1].face)
  })

  test('is deterministic for a fixed rng', () => {
    expect(scramble(20, seeded(7))).toEqual(scramble(20, seeded(7)))
  })

  test('length 0 gives no moves', () => {
    expect(scramble(0)).toEqual([])
  })

  test('produces legal moves and a non-solved cube', () => {
    const ms: Move[] = scramble(25, seeded(3))
    ms.forEach((m) => {
      expect(FACES).toContain(m.face)
      expect([1, 2, 3]).toContain(m.turns)
    })
    expect(isSolved(applyMoves(SOLVED, ms))).toBe(false)
  })
})
