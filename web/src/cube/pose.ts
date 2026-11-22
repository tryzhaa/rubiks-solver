import { Matrix4, Vector3 } from 'three'
import { type LayerTurn, cubieInLayer, layerTurn } from './layers'
import type { Move } from './moves'

export interface Cubie {
  /** Solved position, each component -1, 0 or 1. */
  home: [number, number, number]
  /** Current placement (rotation + translation), always snapped to exact integers. */
  matrix: Matrix4
}

const AXES: Record<LayerTurn['axis'], Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
}

export function createCubies(): Cubie[] {
  const cubies: Cubie[] = []
  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        cubies.push({ home: [x, y, z], matrix: new Matrix4().makeTranslation(x, y, z) })
      }
    }
  }
  return cubies
}

export function cubiePosition(c: Cubie): [number, number, number] {
  const e = c.matrix.elements
  return [Math.round(e[12]) + 0, Math.round(e[13]) + 0, Math.round(e[14]) + 0]
}

function snap(m: Matrix4): void {
  const e = m.elements
  for (let i = 0; i < 16; i++) e[i] = Math.round(e[i]) + 0
}

/** Instantly applies one layer turn to every cubie in that layer (mutates). */
export function applyTurn(cubies: Cubie[], turn: LayerTurn): void {
  const rotation = new Matrix4().makeRotationAxis(AXES[turn.axis], (turn.quarterTurns * Math.PI) / 2)
  for (const c of cubies) {
    if (!cubieInLayer(cubiePosition(c), turn)) continue
    c.matrix.premultiply(rotation)
    snap(c.matrix)
  }
}

/** Cubie placements after performing `moves` on a solved cube. */
export function poseAfter(moves: Move[]): Cubie[] {
  const cubies = createCubies()
  for (const m of moves) applyTurn(cubies, layerTurn(m))
  return cubies
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
