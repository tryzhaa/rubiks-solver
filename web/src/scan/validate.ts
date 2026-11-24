import type { Face } from '@/cube/moves'
import { CORNER_SLOTS, type CornerSlot, EDGE_SLOTS, type EdgeSlot, stickerIndex } from '@/solver/pieces'

export type Problem = 'length' | 'centres' | 'count' | 'pieces' | 'twist' | 'flip' | 'parity'
export type Validation = { ok: true } | { ok: false; problem: Problem; message: string; stickers: number[] }

export const COLOUR_WORDS: Record<string, string> = {
  U: 'white',
  D: 'yellow',
  R: 'red',
  L: 'orange',
  F: 'green',
  B: 'blue',
}

const LETTERS = 'URFDLB'
const CENTRES = [4, 13, 22, 31, 40, 49]

/** Each slot's faces in Kociemba reference order (orientation is measured against these). */
const CORNER_ORDER: Record<CornerSlot, Face[]> = {
  UFR: ['U', 'R', 'F'],
  UFL: ['U', 'F', 'L'],
  UBL: ['U', 'L', 'B'],
  UBR: ['U', 'B', 'R'],
  DFR: ['D', 'F', 'R'],
  DFL: ['D', 'L', 'F'],
  DBL: ['D', 'B', 'L'],
  DBR: ['D', 'R', 'B'],
}
const EDGE_ORDER: Record<EdgeSlot, Face[]> = {
  UR: ['U', 'R'],
  UF: ['U', 'F'],
  UL: ['U', 'L'],
  UB: ['U', 'B'],
  DR: ['D', 'R'],
  DF: ['D', 'F'],
  DL: ['D', 'L'],
  DB: ['D', 'B'],
  FR: ['F', 'R'],
  FL: ['F', 'L'],
  BL: ['B', 'L'],
  BR: ['B', 'R'],
}

const fail = (problem: Problem, message: string, stickers: number[] = []): Validation => ({
  ok: false,
  problem,
  message,
  stickers,
})

const key = (letters: string[]) => [...letters].sort().join('')

interface Piece<S extends string> {
  slot: S
  faces: Face[]
  colours: string[]
  indices: number[]
}

function readPieces<S extends EdgeSlot | CornerSlot>(state: string, order: Record<S, Face[]>): Piece<S>[] {
  return (Object.keys(order) as S[]).map((slot) => {
    const faces = order[slot]
    const indices = faces.map((f) => stickerIndex(slot, f))
    return { slot, faces, indices, colours: indices.map((i) => state[i]) }
  })
}

/** Slots whose piece is not a real piece, or is a real piece that also appears elsewhere. */
function badPieces<S extends string>(pieces: Piece<S>[], slots: S[]): Piece<S>[] {
  const real = new Set(slots.map((s) => key(s.split(''))))
  const seen = new Map<string, number>()
  for (const p of pieces) seen.set(key(p.colours), (seen.get(key(p.colours)) ?? 0) + 1)
  return pieces.filter((p) => !real.has(key(p.colours)) || seen.get(key(p.colours))! > 1)
}

/**
 * Corners whose colours run the wrong way round: read in reference order, a real corner's colours are a
 * rotation of its home slot's faces in reference order. A mirrored corner has the right colours but can't exist.
 */
function mirroredCorners(corners: Piece<CornerSlot>[]): Piece<CornerSlot>[] {
  return corners.filter((p) => {
    const home = CORNER_SLOTS.find((slot) => key(slot.split('')) === key(p.colours))
    if (!home) return false // not a real colour set; badPieces reports it
    const want = CORNER_ORDER[home]
    return ![0, 1, 2].some((k) => p.colours.every((c, j) => c === want[(j + k) % 3]))
  })
}

function parity(permutation: number[]): number {
  const visited = permutation.map(() => false)
  let swaps = 0
  for (let i = 0; i < permutation.length; i++) {
    let length = 0
    for (let j = i; !visited[j]; j = permutation[j]) {
      visited[j] = true
      length++
    }
    if (length > 0) swaps += length - 1
  }
  return swaps % 2
}

/** For each slot, the index (in the same slot order) of the slot its piece belongs in. */
function homes<S extends string>(pieces: Piece<S>[]): number[] {
  return pieces.map((p) => pieces.findIndex((q) => key(q.slot.split('')) === key(p.colours)))
}

const isUD = (c: string) => c === 'U' || c === 'D'

/** Checks a facelet string (centres at home) is a cube that can be solved, naming the likely problem. */
export function validateState(state: string): Validation {
  if (state.length !== 54 || [...state].some((c) => !LETTERS.includes(c))) {
    return fail('length', 'The cube needs 54 stickers.')
  }
  const wrongCentres = CENTRES.filter((i, k) => state[i] !== 'URFDLB'[k])
  if (wrongCentres.length > 0) return fail('centres', 'The centre stickers are in the wrong places.', wrongCentres)

  const counts = Object.fromEntries([...LETTERS].map((c) => [c, [...state].filter((x) => x === c).length]))
  const over = [...LETTERS].filter((c) => counts[c] > 9)
  if (over.length > 0) {
    const under = [...LETTERS].filter((c) => counts[c] < 9)
    const list = (cs: string[]) => cs.map((c) => `${COLOUR_WORDS[c]} (${counts[c]})`).join(', ')
    const stickers = [...state].flatMap((c, i) => (over.includes(c) && !CENTRES.includes(i) ? [i] : []))
    return fail(
      'count',
      `Each colour should appear 9 times. Too many: ${list(over)}. Too few: ${list(under)}.`,
      stickers,
    )
  }

  const corners = readPieces(state, CORNER_ORDER)
  const edges = readPieces(state, EDGE_ORDER)
  const bad = [...badPieces(corners, CORNER_SLOTS), ...mirroredCorners(corners), ...badPieces(edges, EDGE_SLOTS)]
  if (bad.length > 0) {
    return fail(
      'pieces',
      "Some pieces have colour combinations a real cube doesn't have. Check the marked stickers.",
      bad.flatMap((p) => p.indices),
    )
  }

  const twist = corners.reduce((sum, p) => sum + p.colours.findIndex(isUD), 0)
  if (twist % 3 !== 0) {
    return fail('twist', 'One corner looks twisted, so a corner sticker was probably misread. Check the marked stickers.')
  }

  const flip = edges.reduce((sum, p) => {
    const first = p.colours[0]
    const ok = p.colours.some(isUD) ? isUD(first) : first === 'F' || first === 'B'
    return sum + (ok ? 0 : 1)
  }, 0)
  if (flip % 2 !== 0) {
    return fail('flip', 'One edge looks flipped, so an edge sticker was probably misread. Check the marked stickers.')
  }

  if (parity(homes(corners)) !== parity(homes(edges))) {
    return fail('parity', 'Two pieces look swapped. Check the marked stickers against your cube.')
  }
  return { ok: true }
}
