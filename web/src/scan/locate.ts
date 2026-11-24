import { type Lab, labDistance, rgbToLab } from './colour'

export interface Rect {
  x: number
  y: number
  size: number
}

/** Work on every STEP-th pixel: plenty for finding a face, and cheap enough to run 10 times a second. */
const STEP = 2
/** Grid cells the sticker mask is grown by, to bridge the thin black lines between stickers. */
const BRIDGE = 2
/** Smallest face, as a share of the frame's short side. */
const MIN_SIZE = 0.2
/** Widest and tallest a face's box may be relative to the other side. */
const MAX_ASPECT = 1.35
/** Share of a face's box that must be sticker-coloured. */
const MIN_FILL = 0.5
/** How far a face may drift between frames (share of its size) and still count as held still. */
const MAX_DRIFT = 0.06

const COLOURED: Lab[] = (
  [
    [230, 210, 40],
    [190, 30, 40],
    [240, 110, 30],
    [30, 160, 70],
    [20, 70, 190],
  ] as const
).map((c) => rgbToLab([...c]))

/** Sticker colour class of a pixel: 0 none, 1 white-ish (almost no colour), 2+ a strong cube colour. Skin, grey and dark are 0. */
function colourClass(lab: Lab): number {
  const chroma = Math.hypot(lab[1], lab[2])
  if (lab[0] > 55 && chroma < 14) return 1
  if (chroma <= 35) return 0
  let best = 0
  let bestDistance = 50
  COLOURED.forEach((c, k) => {
    const d = labDistance(lab, c)
    if (d < bestDistance) {
      bestDistance = d
      best = k + 2
    }
  })
  return best
}

/** Flood-fills 4-connected cells for which `joins(cell)` holds, from `start`; returns the cells and their box. */
function flood(
  start: number,
  gw: number,
  gh: number,
  joins: (cell: number) => boolean,
  seen: Uint8Array,
  queue: Int32Array,
): { count: number; minX: number; minY: number; maxX: number; maxY: number } {
  let head = 0
  let tail = 0
  queue[tail++] = start
  seen[start] = 1
  let minX = gw
  let minY = gh
  let maxX = 0
  let maxY = 0
  while (head < tail) {
    const p = queue[head++]
    const x = p % gw
    const y = (p - x) / gw
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    const around = [x > 0 ? p - 1 : -1, x < gw - 1 ? p + 1 : -1, y > 0 ? p - gw : -1, y < gh - 1 ? p + gw : -1]
    for (const n of around) {
      if (n >= 0 && !seen[n] && joins(n)) {
        seen[n] = 1
        queue[tail++] = n
      }
    }
  }
  return { count: tail, minX, minY, maxX, maxY }
}

/**
 * Finds a cube face anywhere in an RGBA frame: the largest roughly square, well-filled patch of
 * sticker-coloured pixels that doesn't touch the frame edge (walls and tables do). Null when none.
 */
export function locateFace(pixels: Uint8ClampedArray, width: number, height: number): Rect | null {
  const gw = Math.floor(width / STEP)
  const gh = Math.floor(height / STEP)
  const classes = new Uint8Array(gw * gh)
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const i = (gy * STEP * width + gx * STEP) * 4
      classes[gy * gw + gx] = colourClass(rgbToLab([pixels[i], pixels[i + 1], pixels[i + 2]]))
    }
  }
  const queue = new Int32Array(gw * gh)
  const touchesEdge = (b: { minX: number; minY: number; maxX: number; maxY: number }) =>
    b.minX === 0 || b.minY === 0 || b.maxX === gw - 1 || b.maxY === gh - 1

  // 1. Patches of one colour. Drop any touching the frame edge (a wall or table behind the cube),
  //    so they can't join the face in the next step.
  const mask = new Uint8Array(gw * gh)
  const seenColour = new Uint8Array(gw * gh)
  for (let start = 0; start < gw * gh; start++) {
    if (!classes[start] || seenColour[start]) continue
    const cls = classes[start]
    const patch = flood(start, gw, gh, (n) => classes[n] === cls, seenColour, queue)
    if (touchesEdge(patch)) continue
    for (let k = 0; k < patch.count; k++) mask[queue[k]] = 1
  }

  // 2. Grow the kept patches so stickers separated by thin black lines join into one face.
  const grown = new Uint8Array(gw * gh)
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (!mask[gy * gw + gx]) continue
      for (let dy = -BRIDGE; dy <= BRIDGE; dy++) {
        for (let dx = -BRIDGE; dx <= BRIDGE; dx++) {
          const x = gx + dx
          const y = gy + dy
          if (x >= 0 && y >= 0 && x < gw && y < gh) grown[y * gw + x] = 1
        }
      }
    }
  }

  // 3. The largest roughly square, well-filled group is the face.
  const minSide = MIN_SIZE * Math.min(gw, gh)
  const seenFace = new Uint8Array(gw * gh)
  let best: { area: number; rect: Rect } | null = null
  for (let start = 0; start < gw * gh; start++) {
    if (!grown[start] || seenFace[start]) continue
    const group = flood(start, gw, gh, (n) => grown[n] === 1, seenFace, queue)
    if (touchesEdge(group)) continue
    // Undo the growth to get the stickers' own box.
    const x0 = group.minX + BRIDGE
    const y0 = group.minY + BRIDGE
    const x1 = group.maxX - BRIDGE
    const y1 = group.maxY - BRIDGE
    const w = x1 - x0 + 1
    const h = y1 - y0 + 1
    if (w < minSide || h < minSide || Math.max(w, h) / Math.min(w, h) > MAX_ASPECT) continue
    let filled = 0
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) filled += mask[y * gw + x]
    if (filled / (w * h) < MIN_FILL) continue
    const area = w * h
    if (best && best.area >= area) continue
    const size = ((w + h) / 2) * STEP
    const cx = ((x0 + x1 + 1) / 2) * STEP
    const cy = ((y0 + y1 + 1) / 2) * STEP
    best = { area, rect: { x: Math.round(cx - size / 2), y: Math.round(cy - size / 2), size: Math.round(size) } }
  }
  return best?.rect ?? null
}

/** True when every frame found the face, and it stayed in the same place as in the last frame. */
export function rectsSteady(rects: (Rect | null)[]): boolean {
  const last = rects[rects.length - 1]
  if (rects.length < 2 || !last) return false
  const limit = MAX_DRIFT * last.size
  return rects.every(
    (r) =>
      r !== null &&
      Math.abs(r.x - last.x) <= limit &&
      Math.abs(r.y - last.y) <= limit &&
      Math.abs(r.size - last.size) <= limit,
  )
}
