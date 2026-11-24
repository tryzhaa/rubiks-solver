import { describe, expect, test } from 'vitest'
import { SOLVED, applyMoves, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { classify } from './classify'
import type { RGB } from './colour'
import { SCAN_ORDER, assemble } from './faces'
import { type Rect, locateFace, rectsSteady } from './locate'
import { sampleGrid } from './sample'
import { PALETTE } from './testPalette'

const W = 320
const H = 240
const FACES = ['U', 'R', 'F', 'D', 'L', 'B']

function blank(rgb: RGB = [45, 45, 50]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i++) px.set([...rgb, 255], i * 4)
  return px
}

function fill(px: Uint8ClampedArray, x0: number, y0: number, w: number, h: number, rgb: RGB): void {
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) px.set([...rgb, 255], (y * W + x) * 4)
}

/** A cube face: black plastic with nine stickers and thin gaps, like a real cube. */
function paintFace(px: Uint8ClampedArray, r: Rect, letters: string): void {
  fill(px, r.x, r.y, r.size, r.size, [15, 15, 18])
  const cell = r.size / 3
  const gap = Math.max(2, Math.round(cell * 0.08))
  for (let i = 0; i < 9; i++) {
    const x = Math.round(r.x + (i % 3) * cell) + gap
    const y = Math.round(r.y + Math.floor(i / 3) * cell) + gap
    fill(px, x, y, Math.round(cell) - 2 * gap, Math.round(cell) - 2 * gap, PALETTE[letters[i]])
  }
}

const near = (found: Rect | null, want: Rect) => {
  expect(found).not.toBeNull()
  const tolerance = want.size * 0.08
  expect(Math.abs(found!.x - want.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(found!.y - want.y)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(found!.size - want.size)).toBeLessThanOrEqual(tolerance)
}

describe('locateFace', () => {
  test.each([
    ['centre', { x: 88, y: 48, size: 144 }],
    ['top-left', { x: 12, y: 10, size: 120 }],
    ['bottom-right', { x: 180, y: 96, size: 126 }],
    ['small, off to the left', { x: 30, y: 120, size: 72 }],
  ])('finds a face at the %s', (_, rect) => {
    const px = blank()
    paintFace(px, rect, 'RBDDFRUFB')
    near(locateFace(px, W, H), rect)
  })

  test('finds a face in dim light', () => {
    const px = blank([25, 25, 28])
    const rect = { x: 120, y: 70, size: 110 }
    paintFace(px, rect, 'DLBRFUBFR')
    for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) px[i + c] = px[i + c] * 0.7
    near(locateFace(px, W, H), rect)
  })

  test('nothing to find in an empty frame', () => {
    expect(locateFace(blank(), W, H)).toBeNull()
  })

  test('ignores a white wall touching the frame edge', () => {
    const px = blank()
    fill(px, 0, 0, W, 60, [232, 232, 228])
    const rect = { x: 150, y: 90, size: 120 }
    paintFace(px, rect, 'UUUUUUUUU')
    near(locateFace(px, W, H), rect)
  })

  test('a skin-coloured hand beside the face does not stretch it', () => {
    const px = blank()
    const rect = { x: 100, y: 60, size: 120 }
    fill(px, 40, 70, 64, 110, [224, 172, 140])
    paintFace(px, rect, 'LLFRFBDUL')
    near(locateFace(px, W, H), rect)
  })

  test('round trip: faces held anywhere classify back to the scramble', () => {
    const s = applyMoves(SOLVED, scramble(25, mulberry32(21)))
    const rng = mulberry32(22)
    const byScan = SCAN_ORDER.map(({ face }) => {
      const size = 80 + Math.floor(rng() * 70)
      const rect = { x: 10 + Math.floor(rng() * (W - size - 20)), y: 10 + Math.floor(rng() * (H - size - 20)), size }
      const px = blank()
      const start = FACES.indexOf(face) * 9
      paintFace(px, rect, s.slice(start, start + 9))
      const found = locateFace(px, W, H)
      expect(found).not.toBeNull()
      return sampleGrid(px, W, H, found!)
    })
    expect(classify(assemble(byScan)).state).toBe(s)
  })
})

describe('rectsSteady', () => {
  const r = { x: 50, y: 40, size: 100 }
  test('the same place in every frame is steady', () => {
    expect(rectsSteady([r, r, { x: 52, y: 41, size: 101 }])).toBe(true)
  })
  test('a face that moved is not steady', () => {
    expect(rectsSteady([r, r, { x: 65, y: 40, size: 100 }])).toBe(false)
  })
  test('a frame without a face is not steady', () => {
    expect(rectsSteady([r, null, r])).toBe(false)
  })
})
