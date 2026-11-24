import { formatMoves } from '@/cube/moves'
import type { Step } from './step'

export const FINISHED_TITLE = 'Solved!'
export const FINISHED_WHY = 'Every face is one colour again. Press New scramble to try another.'

/** The step holding move number `moveIndex` (the next move to play), or null once every move is done. */
export function stepAt(steps: Step[], moveIndex: number): { stepIndex: number; step: Step } | null {
  let start = 0
  const index = Math.max(0, moveIndex)
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex]
    start += step.moves.length
    if (index < start) return { stepIndex, step }
  }
  return null
}

export interface Banner {
  title: string
  /** The named algorithm with ` ×N` when it is repeated; empty for a setup-only step. */
  algorithm: string
  /** Positioning turns done first; empty when there are none. */
  setup: string
  why: string
}

/** What the step banner shows at `moveIndex`. */
export function bannerFor(steps: Step[], moveIndex: number): Banner {
  const found = stepAt(steps, moveIndex)
  if (!found) return { title: FINISHED_TITLE, algorithm: '', setup: '', why: FINISHED_WHY }
  const { step } = found
  const algorithm = formatMoves(step.algorithm) + (step.repeat > 1 ? ` ×${step.repeat}` : '')
  return { title: `${step.stageName}: ${step.caseName}`, algorithm, setup: formatMoves(step.setup), why: step.why }
}
