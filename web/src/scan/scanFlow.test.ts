import { describe, expect, test } from 'vitest'
import { SOLVED, applyMoves, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { SCAN_ORDER } from './faces'
import { initialScan, scanReducer } from './scanFlow'
import { PALETTE } from './testPalette'

const FACES = ['U', 'R', 'F', 'D', 'L', 'B']
const faceSamples = (s: string, k: number) => {
  const start = FACES.indexOf(SCAN_ORDER[k].face) * 9
  return s.slice(start, start + 9).split('').map((c) => PALETTE[c])
}
const scanAll = (s: string) =>
  SCAN_ORDER.reduce((st, _, k) => scanReducer(st, { type: 'capture', samples: faceSamples(s, k) }), initialScan)

describe('scanReducer', () => {
  test('six captures lead to review with the scanned state', () => {
    const s = applyMoves(SOLVED, scramble(25, mulberry32(5)))
    expect(scanAll(s)).toMatchObject({ stage: 'review', state: s })
  })

  test('retaking one face replaces only that face', () => {
    const s = applyMoves(SOLVED, scramble(25, mulberry32(5)))
    const reviewed = scanAll(s)
    const retake = scanReducer(reviewed, { type: 'retake', face: 2 })
    expect(retake).toMatchObject({ stage: 'camera', face: 2 })
    const again = scanReducer(retake, { type: 'capture', samples: faceSamples(s, 2) })
    expect(again).toMatchObject({ stage: 'review', state: s })
    expect(again.samples.filter((_, k) => k !== 2)).toEqual(reviewed.samples.filter((_, k) => k !== 2))
  })

  test('manual entry starts from solved; centres cannot be edited', () => {
    const m = scanReducer(initialScan, { type: 'manual' })
    expect(m).toMatchObject({ stage: 'review', state: SOLVED, confidence: null })
    expect(scanReducer(m, { type: 'setSticker', index: 4, letter: 'R' }).state).toBe(SOLVED)
    expect(scanReducer(m, { type: 'setSticker', index: 0, letter: 'R' }).state![0]).toBe('R')
  })

  test('restart goes back to the first face with nothing captured', () => {
    const s = applyMoves(SOLVED, scramble(25, mulberry32(5)))
    expect(scanReducer(scanAll(s), { type: 'restart' })).toEqual(initialScan)
  })
})
