import { describe, expect, test } from 'vitest'
import { formatMove, invertMove, invertMoves, parseMoves } from './moves'

describe('parseMoves', () => {
  test('parses quarter, double and prime turns', () => {
    expect(parseMoves("R U2 F'")).toEqual([
      { face: 'R', turns: 1 },
      { face: 'U', turns: 2 },
      { face: 'F', turns: 3 },
    ])
  })

  test('empty and whitespace-only input give no moves', () => {
    expect(parseMoves('')).toEqual([])
    expect(parseMoves('   ')).toEqual([])
  })

  test('tolerates extra whitespace', () => {
    expect(parseMoves('  R   U ')).toHaveLength(2)
  })

  test.each(['R3', 'X', "R''", 'r', '2R'])('rejects bad token %s naming it', (bad) => {
    expect(() => parseMoves(`U ${bad}`)).toThrow(bad)
  })
})

describe('formatMove', () => {
  test.each(['U', "U'", 'U2', 'D', "L'", 'R2', 'F', "B'"])('round-trips %s', (t) => {
    expect(formatMove(parseMoves(t)[0])).toBe(t)
  })
})

describe('invert', () => {
  test('invertMove flips quarter turns and keeps half turns', () => {
    expect(invertMove({ face: 'R', turns: 1 })).toEqual({ face: 'R', turns: 3 })
    expect(invertMove({ face: 'R', turns: 3 })).toEqual({ face: 'R', turns: 1 })
    expect(invertMove({ face: 'R', turns: 2 })).toEqual({ face: 'R', turns: 2 })
  })

  test('invertMoves reverses order and inverts each', () => {
    expect(invertMoves(parseMoves("R U2 F'")).map(formatMove).join(' ')).toBe("F U2 R'")
  })
})
