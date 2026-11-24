import { describe, expect, test } from 'vitest'
import type { Face } from '@/cube/moves'
import { faceletIndex } from '@/cube/state'
import { EDGE_SLOTS } from '@/solver/pieces'
import type { RGB } from './colour'
import { SCAN_ORDER, assemble } from './faces'

const FACES = ['U', 'R', 'F', 'D', 'L', 'B']
const VEC: Record<Face, [number, number, number]> = {
  R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1],
}
function slotPosition(slot: string): [number, number, number] {
  const pos: [number, number, number] = [0, 0, 0]
  for (const f of slot.split('') as Face[]) VEC[f].forEach((v, i) => (pos[i] += v))
  return pos
}

describe('scan guide', () => {
  test('each scan face has the right neighbour on top in the facelet layout', () => {
    // Row 0, column 1 of a face sits on the edge it shares with its top neighbour.
    for (const { face, top } of SCAN_ORDER) {
      const slot = EDGE_SLOTS.find((e) => [...e].sort().join() === [face, top].sort().join())!
      expect(faceletIndex(face, slotPosition(slot))).toBe(FACES.indexOf(face) * 9 + 1)
    }
  })

  test('scans every face once', () => {
    expect(SCAN_ORDER.map((s) => s.face).sort()).toEqual([...FACES].sort())
  })

  test('assemble puts each scanned face in its facelet block', () => {
    const byScan = SCAN_ORDER.map((_, k) => Array.from({ length: 9 }, () => [k, k, k] as RGB))
    const all = assemble(byScan)
    expect(all).toHaveLength(54)
    SCAN_ORDER.forEach(({ face }, k) => expect(all[FACES.indexOf(face) * 9 + 4]).toEqual([k, k, k]))
  })
})
