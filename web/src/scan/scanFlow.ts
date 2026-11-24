import type { Face } from '@/cube/moves'
import { SOLVED } from '@/cube/state'
import { classify } from './classify'
import type { RGB } from './colour'
import { SCAN_ORDER, assemble } from './faces'

const CENTRES = [4, 13, 22, 31, 40, 49]

export interface ScanState {
  stage: 'camera' | 'review'
  /** SCAN_ORDER index of the face being captured. */
  face: number
  /** Captured samples by SCAN_ORDER index. */
  samples: (RGB[] | null)[]
  /** Facelet string under review. */
  state: string | null
  /** From classify; null for a cube entered by hand. */
  confidence: number[] | null
}

export type ScanAction =
  | { type: 'capture'; samples: RGB[] }
  | { type: 'retake'; face: number }
  | { type: 'manual' }
  | { type: 'setSticker'; index: number; letter: Face }
  | { type: 'restart' }

export const initialScan: ScanState = {
  stage: 'camera',
  face: 0,
  samples: SCAN_ORDER.map(() => null),
  state: null,
  confidence: null,
}

export function scanReducer(s: ScanState, a: ScanAction): ScanState {
  switch (a.type) {
    case 'capture': {
      const samples = s.samples.map((x, k) => (k === s.face ? a.samples : x))
      const missing = samples.findIndex((x) => x === null)
      if (missing !== -1) return { ...s, samples, face: missing }
      // Every face captured: classify again (this drops earlier hand edits).
      const { state, confidence } = classify(assemble(samples as RGB[][]))
      return { ...s, samples, stage: 'review', state, confidence }
    }
    case 'retake':
      return { ...s, stage: 'camera', face: a.face }
    case 'manual':
      return { ...s, stage: 'review', state: s.state ?? SOLVED, confidence: s.state ? s.confidence : null }
    case 'setSticker': {
      if (!s.state || CENTRES.includes(a.index)) return s
      return { ...s, state: s.state.slice(0, a.index) + a.letter + s.state.slice(a.index + 1) }
    }
    case 'restart':
      return initialScan
  }
}
