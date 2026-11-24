import { describe, expect, test } from 'vitest'
import { mulberry32 } from '@/garden/layout/random'
import type { RGB } from './colour'
import { STEADY_FRAMES, averageFrames, autoCaptureReady, nearestFace } from './autoCapture'
import { PALETTE } from './testPalette'

const face = (letters: string): RGB[] => letters.split('').map((c) => PALETTE[c])
const repeat = (frame: RGB[], n = STEADY_FRAMES) => Array.from({ length: n }, () => frame)
const GREEN_FACE = face('RBDDFRUFB') // centre is green (F)

describe('nearestFace', () => {
  test('names each sticker colour, also in dim and bright light', () => {
    for (const [letter, rgb] of Object.entries(PALETTE))
      for (const light of [0.7, 1, 1.08])
        expect(nearestFace(rgb.map((v) => Math.min(255, v * light)) as RGB)).toBe(letter)
  })
})

describe('autoCaptureReady', () => {
  test('a face held still with the expected centre is ready', () => {
    expect(autoCaptureReady(repeat(GREEN_FACE), 'F')).toBe(true)
  })

  test('small camera noise still counts as still', () => {
    const rng = mulberry32(4)
    const frames = repeat(GREEN_FACE).map((f) => f.map((c) => c.map((v) => v + (rng() - 0.5) * 6) as RGB))
    expect(autoCaptureReady(frames, 'F')).toBe(true)
  })

  test('not ready until the cube has been still for long enough', () => {
    expect(autoCaptureReady(repeat(GREEN_FACE, STEADY_FRAMES - 1), 'F')).toBe(false)
  })

  test('not ready while the cube is moving', () => {
    const frames = repeat(GREEN_FACE)
    frames[STEADY_FRAMES - 3] = face('RBDDFRUFL')
    expect(autoCaptureReady(frames, 'F')).toBe(false)
  })

  test('not ready while the previous face is still showing', () => {
    expect(autoCaptureReady(repeat(GREEN_FACE), 'R')).toBe(false)
  })

  test('not ready when the grid shows no cube (dark background)', () => {
    const dark = Array.from({ length: 9 }, () => [35, 35, 40] as RGB)
    dark[4] = PALETTE.F
    expect(autoCaptureReady(repeat(dark), 'F')).toBe(false)
  })
})

describe('averageFrames', () => {
  test('averages each cell over the frames', () => {
    const a = face('UUUUUUUUU')
    const b = a.map((c) => c.map((v) => v - 10) as RGB)
    expect(averageFrames([a, b])[0]).toEqual([230, 230, 225])
  })
})
