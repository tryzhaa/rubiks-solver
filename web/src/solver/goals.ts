import type { Face } from '@/cube/moves'
import { type CornerSlot, type EdgeSlot, centre, slotFaces, sticker } from './pieces'

// White is the D centre and yellow the U centre (the solve holds the cube with z2 first).
// Every check compares stickers with the current centres.

const U_EDGES: EdgeSlot[] = ['UF', 'UR', 'UB', 'UL']
const D_EDGES: EdgeSlot[] = ['DF', 'DR', 'DB', 'DL']
const MIDDLE_EDGES: EdgeSlot[] = ['FR', 'FL', 'BR', 'BL']
const U_CORNERS: CornerSlot[] = ['UFR', 'UFL', 'UBR', 'UBL']
const D_CORNERS: CornerSlot[] = ['DFR', 'DFL', 'DBR', 'DBL']
const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

function pieceSolved(s: string, slot: EdgeSlot | CornerSlot): boolean {
  return slotFaces(slot).every((f) => sticker(s, slot, f) === centre(s, f))
}

function sameColours(s: string, slot: CornerSlot): boolean {
  const have = slotFaces(slot).map((f) => sticker(s, slot, f)).sort().join('')
  const want = slotFaces(slot).map((f) => centre(s, f)).sort().join('')
  return have === want
}

export function daisyDone(s: string): boolean {
  return U_EDGES.every((e) => sticker(s, e, 'U') === centre(s, 'D'))
}

export function crossDone(s: string): boolean {
  return D_EDGES.every((e) => pieceSolved(s, e))
}

export function firstLayerDone(s: string): boolean {
  return crossDone(s) && D_CORNERS.every((c) => pieceSolved(s, c))
}

export function middleDone(s: string): boolean {
  return firstLayerDone(s) && MIDDLE_EDGES.every((e) => pieceSolved(s, e))
}

export function yellowCrossDone(s: string): boolean {
  return middleDone(s) && U_EDGES.every((e) => sticker(s, e, 'U') === centre(s, 'U'))
}

export function yellowEdgesDone(s: string): boolean {
  return yellowCrossDone(s) && U_EDGES.every((e) => pieceSolved(s, e))
}

export function cornersPlaced(s: string): boolean {
  return yellowEdgesDone(s) && U_CORNERS.every((c) => sameColours(s, c))
}

export function allFacesSolved(s: string): boolean {
  return FACES.every((f) => {
    const start = FACES.indexOf(f) * 9
    return s.slice(start, start + 9) === s[start].repeat(9)
  })
}
