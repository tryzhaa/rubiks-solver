import type { Face } from '@/cube/moves'
import { type Lab, type RGB, labDistance, rgbToLab } from './colour'

/** Frames the cube must be held still before a face is stored (sampled about 10 times a second). */
export const STEADY_FRAMES = 8
/** Largest change in any cell (ΔE) between frames that still counts as holding still. */
const MAX_MOVE = 10
/** A cell further than this (ΔE) from every typical sticker colour is not a sticker (hand, table, background). */
const MAX_STICKER_DISTANCE = 45

/** Typical camera colours of each sticker, used for live labels and to recognise the face being shown. */
const TYPICAL: Record<Face, RGB> = {
  U: [235, 235, 230],
  D: [230, 210, 40],
  R: [190, 30, 40],
  L: [240, 110, 30],
  F: [30, 160, 70],
  B: [20, 70, 190],
}
const TYPICAL_LAB = Object.entries(TYPICAL).map(([face, rgb]) => ({ face: face as Face, lab: rgbToLab(rgb) }))

function nearest(lab: Lab): { face: Face; distance: number } {
  return TYPICAL_LAB.map(({ face, lab: t }) => ({ face, distance: labDistance(lab, t) })).reduce((a, b) =>
    b.distance < a.distance ? b : a,
  )
}

/** Best guess of which sticker colour a camera colour is (final colours come from classify, against the centres). */
export function nearestFace(rgb: RGB): Face {
  return nearest(rgbToLab(rgb)).face
}

/**
 * True when the last STEADY_FRAMES frames show a cube face held still, every cell looks like a sticker,
 * and the centre is the colour expected for this face (so the previous face is not stored twice).
 */
export function autoCaptureReady(frames: RGB[][], expectedCentre: Face): boolean {
  if (frames.length < STEADY_FRAMES) return false
  const recent = frames.slice(-STEADY_FRAMES).map((frame) => frame.map(rgbToLab))
  const last = recent[recent.length - 1]
  const still = recent.every((frame) => frame.every((lab, i) => labDistance(lab, last[i]) <= MAX_MOVE))
  if (!still) return false
  if (last.some((lab) => nearest(lab).distance > MAX_STICKER_DISTANCE)) return false
  return nearest(last[4]).face === expectedCentre
}

/** Each cell's mean over the frames, which smooths out camera noise. */
export function averageFrames(frames: RGB[][]): RGB[] {
  return frames[0].map((_, i) => {
    const sum = frames.reduce((s, f) => [s[0] + f[i][0], s[1] + f[i][1], s[2] + f[i][2]], [0, 0, 0])
    return [sum[0] / frames.length, sum[1] / frames.length, sum[2] / frames.length] as RGB
  })
}
