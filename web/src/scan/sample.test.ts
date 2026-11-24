import { describe, expect, test } from 'vitest'
import { SOLVED, applyMoves, scramble } from '@/cube/state'
import { mulberry32 } from '@/garden/layout/random'
import { classify } from './classify'
import type { RGB } from './colour'
import { SCAN_ORDER, assemble } from './faces'
import { gridRect, sampleGrid } from './sample'
import { PALETTE } from './testPalette'

const FACES = ['U', 'R', 'F', 'D', 'L', 'B']

function frame(width: number, height: number, cells: RGB[]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(width * height * 4).fill(40)
  const { x, y, size } = gridRect(width, height)
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      for (let py = y + Math.floor((r * size) / 3); py < y + Math.floor(((r + 1) * size) / 3); py++)
        for (let pxl = x + Math.floor((c * size) / 3); pxl < x + Math.floor(((c + 1) * size) / 3); pxl++)
          px.set([...cells[r * 3 + c], 255], (py * width + pxl) * 4)
  return px
}

describe('sampling', () => {
  test('gridRect is a centred 60% square', () => {
    expect(gridRect(320, 240)).toEqual({ x: 88, y: 48, size: 144 })
  })

  test('sampleGrid reads each cell, row by row', () => {
    const cells = Array.from({ length: 9 }, (_, i) => [i * 20, 255 - i * 20, 100] as RGB)
    expect(sampleGrid(frame(320, 240, cells), 320, 240)).toEqual(cells)
  })

  test('round trip: painted faces of a scramble classify back to it', () => {
    const s = applyMoves(SOLVED, scramble(25, mulberry32(12)))
    const byScan = SCAN_ORDER.map(({ face }) => {
      const block = s.slice(FACES.indexOf(face) * 9, FACES.indexOf(face) * 9 + 9).split('')
      return sampleGrid(frame(320, 240, block.map((c) => PALETTE[c])), 320, 240)
    })
    expect(classify(assemble(byScan)).state).toBe(s)
  })
})
