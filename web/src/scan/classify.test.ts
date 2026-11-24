import { describe, expect, test } from 'vitest'
import { SOLVED, applyMoves, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { classify } from './classify'
import type { RGB } from './colour'
import { paint } from './testPalette'

describe('classify', () => {
  test('exact palette colours classify back to the state', () => {
    const s = applyMoves(SOLVED, scramble(25, mulberry32(3)))
    expect(classify(paint(s)).state).toBe(s)
  })

  test.each(Array.from({ length: 50 }, (_, i) => i))('scramble %i survives per-face lighting and noise', (i) => {
    const rng = mulberry32(500 + i)
    const s = applyMoves(SOLVED, scramble(25, rng))
    const samples = paint(s).map((c, k) => {
      const light = 0.75 + (0.3 * ((Math.floor(k / 9) * 7919) % 11)) / 10 // 0.75..1.05 per face
      return c.map((v) => Math.max(0, Math.min(255, v * light + (rng() - 0.5) * 24))) as RGB
    })
    expect(classify(samples).state).toBe(s)
  })

  test('a sticker halfway between red and orange gets low confidence', () => {
    const samples = paint(SOLVED)
    samples[0] = [215, 70, 35] // a U sticker that looks red-orange
    const { confidence } = classify(samples)
    const others = confidence.filter((c, i) => i !== 0 && Number.isFinite(c))
    expect(confidence[0]).toBeLessThan(Math.min(...others))
  })

  test('every colour appears nine times', () => {
    const grey = paint(SOLVED).map(() => [128, 128, 128] as RGB)
    const counts = [...classify(grey).state].reduce<Record<string, number>>((m, c) => ({ ...m, [c]: (m[c] ?? 0) + 1 }), {})
    expect(Object.values(counts)).toEqual([9, 9, 9, 9, 9, 9])
  })
})
