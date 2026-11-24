import type { Face } from '@/cube/moves'
import type { RGB } from './colour'

export interface ScanFace {
  face: Face
  colour: string
  /** The face that must be on top while this one faces the camera (matches the facelet layout). */
  top: Face
  instruction: string
}

export const SCAN_ORDER: ScanFace[] = [
  { face: 'F', colour: 'green', top: 'U', instruction: 'Hold the cube with white on top and green facing the camera.' },
  { face: 'R', colour: 'red', top: 'U', instruction: 'Keep white on top. Turn the cube so red faces the camera.' },
  { face: 'B', colour: 'blue', top: 'U', instruction: 'Keep white on top. Turn again so blue faces the camera.' },
  { face: 'L', colour: 'orange', top: 'U', instruction: 'Keep white on top. Turn again so orange faces the camera.' },
  { face: 'U', colour: 'white', top: 'B', instruction: 'Tip the cube so white faces the camera, with blue on top.' },
  { face: 'D', colour: 'yellow', top: 'F', instruction: 'Now show yellow to the camera, with green on top.' },
]

/** Letter labels shown on stickers in the editor. */
export const LETTERS: Record<Face, string> = { U: 'W', D: 'Y', R: 'R', L: 'O', F: 'G', B: 'B' }

/** Sticker colours, the same as the 3D cube's. */
export const STICKER_HEX: Record<Face, string> = {
  R: '#ff1f2d',
  L: '#ff6a00',
  U: '#fafafa',
  D: '#ffe000',
  F: '#00c853',
  B: '#0a55ff',
}

const FACELET_ORDER: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

/** Nine samples per face, indexed like SCAN_ORDER, to 54 samples in facelet order (U R F D L B). */
export function assemble(samplesByScan: RGB[][]): RGB[] {
  return FACELET_ORDER.flatMap((face) => samplesByScan[SCAN_ORDER.findIndex((s) => s.face === face)])
}
