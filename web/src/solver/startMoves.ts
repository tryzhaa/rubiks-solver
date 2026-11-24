import { type Move, invertMoves, parseMoves } from '@/cube/moves'
import { SOLVED, applyMoves } from '@/cube/state'

/** The 24 whole-cube orientations: which face is on top, then a quarter turn about the vertical. */
const ROTATIONS: Move[][] = ['', 'x', 'x2', "x'", 'z', "z'"].flatMap((top) =>
  ['', 'y', 'y2', "y'"].map((spin) => parseMoves(`${top} ${spin}`)),
)

/**
 * A move list that builds `state` from a solved cube, given a solve of it: the solve ends on a turned
 * solved cube, so turn a solved cube the same way and play the solve backwards.
 */
export function startMovesFor(state: string, moves: Move[]): Move[] {
  const end = applyMoves(state, moves)
  const rotation = ROTATIONS.find((r) => applyMoves(SOLVED, r) === end)
  if (!rotation) throw new Error('not a rotation of solved')
  return [...rotation, ...invertMoves(moves)]
}
