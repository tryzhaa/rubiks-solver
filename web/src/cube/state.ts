import type { Face, Move, Rotation } from './moves'

/** Facelet order: U R F D L B, nine stickers per face, row-major (Kociemba layout). */
export const SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

type Vec = [number, number, number]
type Facelet = { pos: Vec; normal: Vec }

const FACE_ORDER: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']
const FACE_AXIS: Record<Face, { axis: 0 | 1 | 2; sign: 1 | -1 }> = {
  R: { axis: 0, sign: 1 },
  L: { axis: 0, sign: -1 },
  U: { axis: 1, sign: 1 },
  D: { axis: 1, sign: -1 },
  F: { axis: 2, sign: 1 },
  B: { axis: 2, sign: -1 },
}

/** Position of sticker (row r, col c) on a face, x to the right, y up, z toward the viewer at F. */
function facelet(face: Face, r: number, c: number): Facelet {
  switch (face) {
    case 'U':
      return { pos: [c - 1, 1, r - 1], normal: [0, 1, 0] }
    case 'R':
      return { pos: [1, 1 - r, 1 - c], normal: [1, 0, 0] }
    case 'F':
      return { pos: [c - 1, 1 - r, 1], normal: [0, 0, 1] }
    case 'D':
      return { pos: [c - 1, -1, 1 - r], normal: [0, -1, 0] }
    case 'L':
      return { pos: [-1, 1 - r, c - 1], normal: [-1, 0, 0] }
    case 'B':
      return { pos: [1 - c, 1 - r, -1], normal: [0, 0, -1] }
  }
}

const FACELETS: Facelet[] = FACE_ORDER.flatMap((face) =>
  Array.from({ length: 9 }, (_, i) => facelet(face, Math.floor(i / 3), i % 3)),
)

const key = (pos: Vec, normal: Vec) => `${pos.join(',')}|${normal.join(',')}`
const INDEX_BY_KEY = new Map(FACELETS.map((f, i) => [key(f.pos, f.normal), i]))

/** Rotate +90 degrees about an axis (right-hand rule). */
function rotate(v: Vec, axis: 0 | 1 | 2): Vec {
  const [x, y, z] = v
  if (axis === 0) return [x, -z, y]
  if (axis === 1) return [z, y, -x]
  return [-y, x, z]
}

/** The sticker index on `face` of the cubie at `pos` (each component -1, 0 or 1). */
export function faceletIndex(face: Face, pos: Vec): number {
  const { axis, sign } = FACE_AXIS[face]
  const normal: Vec = [0, 0, 0]
  normal[axis] = sign
  const index = INDEX_BY_KEY.get(key(pos, normal))
  if (index === undefined) throw new Error(`No ${face} sticker at ${pos.join(',')}`)
  return index
}

/** Whole-cube turns move every layer the way their face turn moves its own. */
const ROTATION_FACE: Record<Rotation, Face> = { x: 'R', y: 'U', z: 'F' }

/**
 * destination[i] = index the sticker at i moves to under one clockwise quarter turn of the face,
 * or of the whole cube when `wholeCube` is set.
 */
function buildPermutation(face: Face, wholeCube = false): number[] {
  const { axis, sign } = FACE_AXIS[face]
  // Clockwise seen from outside = -90 degrees about the outward normal.
  const steps = sign === 1 ? 3 : 1
  return FACELETS.map((f, i) => {
    if (!wholeCube && f.pos[axis] !== sign) return i
    let pos = f.pos
    let normal = f.normal
    for (let s = 0; s < steps; s++) {
      pos = rotate(pos, axis)
      normal = rotate(normal, axis)
    }
    const dest = INDEX_BY_KEY.get(key(pos, normal))
    if (dest === undefined) throw new Error(`No facelet at ${key(pos, normal)}`)
    return dest
  })
}

const PERMUTATIONS: Record<Face | Rotation, number[]> = {
  x: buildPermutation(ROTATION_FACE.x, true),
  y: buildPermutation(ROTATION_FACE.y, true),
  z: buildPermutation(ROTATION_FACE.z, true),
  U: buildPermutation('U'),
  D: buildPermutation('D'),
  L: buildPermutation('L'),
  R: buildPermutation('R'),
  F: buildPermutation('F'),
  B: buildPermutation('B'),
}

export function applyMove(state: string, m: Move): string {
  const perm = PERMUTATIONS[m.face]
  let chars = state.split('')
  for (let t = 0; t < m.turns; t++) {
    const next = chars.slice()
    for (let i = 0; i < 54; i++) next[perm[i]] = chars[i]
    chars = next
  }
  return chars.join('')
}

export function applyMoves(state: string, ms: Move[]): string {
  return ms.reduce(applyMove, state)
}

export function isSolved(state: string): boolean {
  return state === SOLVED
}

export function scramble(length: number, rng: () => number = Math.random): Move[] {
  const faces: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']
  const moves: Move[] = []
  let last: Face | null = null
  for (let i = 0; i < length; i++) {
    const choices = faces.filter((f) => f !== last)
    const face = choices[Math.floor(rng() * choices.length)]
    moves.push({ face, turns: (1 + Math.floor(rng() * 3)) as 1 | 2 | 3 })
    last = face
  }
  return moves
}
