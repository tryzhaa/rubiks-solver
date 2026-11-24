import type { Move } from '@/cube/moves'
import { SOLVED } from '@/cube/state'
import { allFacesSolved } from './goals'
import { cross, daisy, hold, whiteCorners } from './stages/firstLayer'
import { finish, placeCorners, twistCorners, yellowCross, yellowEdges } from './stages/lastLayer'
import { middleLayer } from './stages/middleLayer'
import { type Step, StepBuilder, UnsolvableError } from './step'

export { type Step, UnsolvableError }

export interface Solution {
  steps: Step[]
  /** Every step's moves, in order: exactly what is played. */
  moves: Move[]
}

const STAGES = [
  hold,
  daisy,
  cross,
  whiteCorners,
  middleLayer,
  yellowCross,
  yellowEdges,
  placeCorners,
  twistCorners,
  finish,
]
const CENTRES = [4, 13, 22, 31, 40, 49]

function validate(state: string): void {
  if (state.length !== 54) throw new UnsolvableError('invalid')
  for (const letter of 'URFDLB') {
    if (state.split(letter).length - 1 !== 9) throw new UnsolvableError('invalid')
  }
  if (CENTRES.some((i) => state[i] !== SOLVED[i])) throw new UnsolvableError('invalid')
}

/** Solves a 54-facelet state (centres at home) with the beginner layer-by-layer method. */
export function solve(state: string): Solution {
  validate(state)
  const b = new StepBuilder(state)
  try {
    for (const stage of STAGES) stage(b)
  } catch (error) {
    if (error instanceof UnsolvableError) throw error
    // A piece lookup failed: the stickers describe pieces a real cube does not have.
    throw new UnsolvableError('invalid')
  }
  if (!allFacesSolved(b.state)) throw new UnsolvableError('unsolved')
  return { steps: b.steps, moves: b.steps.flatMap((s) => s.moves) }
}
