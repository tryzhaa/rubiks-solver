import type { Face, Move } from './moves'

export type Axis = 'x' | 'y' | 'z'

/** Rotation in radians = quarterTurns * PI / 2, right-hand rule about the axis. */
export type LayerTurn = { axis: Axis; layer: -1 | 1; quarterTurns: number }

const FACE_LAYER: Record<Face, { axis: Axis; layer: -1 | 1 }> = {
  R: { axis: 'x', layer: 1 },
  L: { axis: 'x', layer: -1 },
  U: { axis: 'y', layer: 1 },
  D: { axis: 'y', layer: -1 },
  F: { axis: 'z', layer: 1 },
  B: { axis: 'z', layer: -1 },
}

export function layerTurn(m: Move): LayerTurn {
  const { axis, layer } = FACE_LAYER[m.face]
  // Clockwise seen from outside: -90 degrees about the positive axis on + faces, +90 on - faces.
  const clockwise = layer === 1 ? -1 : 1
  const quarters = m.turns === 3 ? -1 : m.turns
  return { axis, layer, quarterTurns: clockwise * quarters }
}

const AXIS_INDEX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 }

export function cubieInLayer(pos: [number, number, number], t: LayerTurn): boolean {
  return Math.round(pos[AXIS_INDEX[t.axis]]) === t.layer
}
