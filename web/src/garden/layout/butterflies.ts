import { mulberry32 } from './random'

export type ButterflyKind = 'monarch' | 'admiral' | 'swallow' | 'blue'

export interface FlightParams {
  cx: number
  cz: number
  rx: number
  rz: number
  /** Angular speed of the main loop; negative flies the other way. */
  w: number
  ph: number
  /** Base cruising height. */
  h: number
  /** Height wobble amplitude. */
  ha: number
  /** Wing-flap frequency. */
  flap: number
  kind: ButterflyKind
  scale: number
  isHint: boolean
}

const KINDS: ButterflyKind[] = ['monarch', 'monarch', 'admiral', 'swallow', 'blue']

export function generateButterflies(count: number, seed: number): FlightParams[] {
  const rng = mulberry32(seed)
  const between = (lo: number, hi: number) => lo + rng() * (hi - lo)
  return Array.from({ length: count }, (_, i) => ({
    cx: between(-12, 12),
    cz: between(-12, 12),
    rx: between(2, 8),
    rz: between(2, 8),
    w: between(0.12, 0.4) * (rng() < 0.5 ? -1 : 1),
    ph: between(0, Math.PI * 2),
    // Prototype used 0.8..5; raised to 1.4 so the wobble never dips toward the ground.
    h: between(1.4, 5),
    ha: between(0.3, 0.9),
    flap: between(14, 20),
    kind: KINDS[i % KINDS.length],
    scale: i === 0 ? 1.9 : between(0.65, 1.2),
    isHint: i === 0,
  }))
}

export function butterflyPosition(p: FlightParams, t: number): [number, number, number] {
  const a = t * p.w + p.ph
  return [
    p.cx + Math.cos(a) * p.rx + Math.sin(t * 0.7 + p.ph) * 1.2,
    p.h + Math.sin(t * 0.5 + p.ph) * p.ha + Math.sin(t * 3 + p.ph) * 0.12,
    p.cz + Math.sin(a * 1.3) * p.rz,
  ]
}

/** Yaw (about y) that points a butterfly's -z forward axis along its direction of travel. */
export function butterflyHeading(p: FlightParams, t: number): number {
  const a = butterflyPosition(p, t)
  const b = butterflyPosition(p, t + 0.05)
  return Math.atan2(-(b[0] - a[0]), -(b[2] - a[2]))
}
