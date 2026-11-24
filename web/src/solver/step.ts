import type { Face, Move, Rotation } from '@/cube/moves'
import { applyMoves } from '@/cube/state'

export type StageId =
  | 'hold'
  | 'daisy'
  | 'cross'
  | 'corners'
  | 'middle'
  | 'yellowCross'
  | 'yellowEdges'
  | 'placeCorners'
  | 'twistCorners'
  | 'finish'

export const STAGE_NAMES: Record<StageId, string> = {
  hold: 'Hold the cube',
  daisy: 'Daisy',
  cross: 'White cross',
  corners: 'White corners',
  middle: 'Middle layer',
  yellowCross: 'Yellow cross',
  yellowEdges: 'Yellow edges',
  placeCorners: 'Yellow corners: place',
  twistCorners: 'Yellow corners: twist',
  finish: 'Finish',
}

export interface Step {
  stage: StageId
  stageName: string
  caseName: string
  why: string
  /** Positioning: whole-cube turns and top-layer turns. */
  setup: Move[]
  /** The named algorithm (empty for a setup-only step). */
  algorithm: Move[]
  /** Times the algorithm is done; 0 when the algorithm is empty. */
  repeat: number
  /** Setup, then the algorithm repeated `repeat` times: exactly what is played. */
  moves: Move[]
}

/** The cube cannot be solved: bad input, or a stage met a case that a real cube never has. */
export class UnsolvableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsolvableError'
  }
}

export class StepBuilder {
  state: string
  steps: Step[] = []

  constructor(state: string) {
    this.state = state
  }

  /** Applies and records a step. Skips it entirely when it would have no moves. */
  add(stage: StageId, caseName: string, why: string, setup: Move[], algorithm: Move[], repeat = 1): void {
    const times = algorithm.length === 0 ? 0 : repeat
    const moves = [...setup, ...Array.from({ length: times }, () => algorithm).flat()]
    if (moves.length === 0) return
    this.steps.push({ stage, stageName: STAGE_NAMES[stage], caseName, why, setup, algorithm, repeat: times, moves })
    this.state = applyMoves(this.state, moves)
  }
}

/** The fewest turns of `face` (0..3) after which pred holds, as moves ([] for 0); throws UnsolvableError if none. */
export function turnsUntil(state: string, face: Face | Rotation, pred: (s: string) => boolean): Move[] {
  for (const turns of [0, 1, 2, 3] as const) {
    const moves: Move[] = turns === 0 ? [] : [{ face, turns }]
    if (pred(applyMoves(state, moves))) return moves
  }
  throw new UnsolvableError(`No turn of ${face} reaches the wanted case`)
}
