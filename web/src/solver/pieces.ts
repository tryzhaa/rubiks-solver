import type { Face } from '@/cube/moves'
import { faceletIndex } from '@/cube/state'

export type EdgeSlot = 'UF' | 'UR' | 'UB' | 'UL' | 'DF' | 'DR' | 'DB' | 'DL' | 'FR' | 'FL' | 'BR' | 'BL'
export type CornerSlot = 'UFR' | 'UFL' | 'UBR' | 'UBL' | 'DFR' | 'DFL' | 'DBR' | 'DBL'

export const EDGE_SLOTS: EdgeSlot[] = ['UF', 'UR', 'UB', 'UL', 'DF', 'DR', 'DB', 'DL', 'FR', 'FL', 'BR', 'BL']
export const CORNER_SLOTS: CornerSlot[] = ['UFR', 'UFL', 'UBR', 'UBL', 'DFR', 'DFL', 'DBR', 'DBL']

/** Colour names for the letter on each home face (matches the viewer's sticker colours). */
export const COLOUR_NAMES: Record<string, string> = {
  U: 'white',
  D: 'yellow',
  F: 'green',
  B: 'blue',
  R: 'red',
  L: 'orange',
}

type Vec = [number, number, number]
const FACE_VECTOR: Record<Face, Vec> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

export function slotFaces(slot: EdgeSlot | CornerSlot): Face[] {
  return slot.split('') as Face[]
}

function slotPosition(slot: EdgeSlot | CornerSlot): Vec {
  const pos: Vec = [0, 0, 0]
  for (const face of slotFaces(slot)) FACE_VECTOR[face].forEach((v, i) => (pos[i] += v))
  return pos
}

/** The colour letter showing on `face` of the piece in `slot`. */
export function sticker(state: string, slot: EdgeSlot | CornerSlot, face: Face): string {
  return state[faceletIndex(face, slotPosition(slot))]
}

export function centre(state: string, face: Face): string {
  return state[faceletIndex(face, FACE_VECTOR[face])]
}

function colours(state: string, slot: EdgeSlot | CornerSlot): string {
  return slotFaces(slot)
    .map((f) => sticker(state, slot, f))
    .sort()
    .join('')
}

function findSlot<T extends EdgeSlot | CornerSlot>(state: string, slots: T[], wanted: string[]): T {
  const target = [...wanted].sort().join('')
  const slot = slots.find((s) => colours(state, s) === target)
  if (!slot) throw new Error(`No piece with colours ${wanted.join('')}`)
  return slot
}

export function findEdge(state: string, a: string, b: string): EdgeSlot {
  return findSlot(state, EDGE_SLOTS, [a, b])
}

export function findCorner(state: string, a: string, b: string, c: string): CornerSlot {
  return findSlot(state, CORNER_SLOTS, [a, b, c])
}

/** Which face of the piece in `slot` shows `colour`. */
export function colourFace(state: string, slot: EdgeSlot | CornerSlot, colour: string): Face {
  const face = slotFaces(slot).find((f) => sticker(state, slot, f) === colour)
  if (!face) throw new Error(`${slot} has no ${colour} sticker`)
  return face
}
