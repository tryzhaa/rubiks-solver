import type { Face, Move } from '@/cube/moves'
import { applyMoves } from '@/cube/state'
import { crossDone, firstLayerDone } from '../goals'
import {
  COLOUR_NAMES,
  CORNER_SLOTS,
  type CornerSlot,
  EDGE_SLOTS,
  type EdgeSlot,
  centre,
  findCorner,
  findEdge,
  slotFaces,
  sticker,
} from '../pieces'
import { type StepBuilder, UnsolvableError, turnsUntil } from '../step'

const U_EDGE: Record<string, EdgeSlot> = { F: 'UF', R: 'UR', B: 'UB', L: 'UL' }

const white = (s: string) => centre(s, 'D')

function capitalise(word: string): string {
  return word[0].toUpperCase() + word.slice(1)
}

/** A petal is a white edge on top with white facing up. */
function isPetal(s: string, slot: EdgeSlot): boolean {
  return slot[0] === 'U' && sticker(s, slot, 'U') === white(s)
}

function hasWhite(s: string, slot: EdgeSlot | CornerSlot): boolean {
  return slotFaces(slot).some((f) => sticker(s, slot, f) === white(s))
}

export function hold(b: StepBuilder): void {
  b.add(
    'hold',
    'Upside down',
    'Turn the cube over so white is on the bottom and yellow is on top. The beginner method builds the white layer first and finishes on yellow.',
    [],
    [{ face: 'z', turns: 2 }],
  )
}

/** U turns until the top spot above side `x` holds no petal. */
function freeAbove(s: string, x: Face): Move[] {
  return turnsUntil(s, 'U', (t) => !isPetal(t, U_EDGE[x]))
}

/** Moves that lift a white edge from the middle layer into the top layer with white up. */
function liftFromMiddle(s: string, slot: EdgeSlot): Move[] {
  const side = slotFaces(slot).find((f) => sticker(s, slot, f) !== white(s))!
  const free = freeAbove(s, side)
  const after = applyMoves(s, free)
  for (const turns of [1, 3] as const) {
    const lift: Move = { face: side, turns }
    if (isPetal(applyMoves(after, [lift]), U_EDGE[side])) return [...free, lift]
  }
  throw new UnsolvableError('daisy')
}

export function daisy(b: StepBuilder): void {
  if (crossDone(b.state)) return
  for (let count = 0; ; count++) {
    const s = b.state
    const slot = EDGE_SLOTS.find((e) => hasWhite(s, e) && !isPetal(s, e))
    if (!slot) return
    if (count >= 8) throw new UnsolvableError('daisy')
    const [a, c] = slotFaces(slot)
    if (a === 'D' && sticker(s, slot, 'D') === white(s)) {
      const free = freeAbove(s, c)
      b.add(
        'daisy',
        'Edge on the bottom, white facing down',
        'Free the spot above it, then turn that side twice to lift the edge up with white facing up.',
        [],
        [...free, { face: c, turns: 2 }],
      )
    } else if (a !== 'U' && a !== 'D') {
      b.add(
        'daisy',
        'Edge in the middle layer',
        'Free the spot above, then turn the side once to lift the edge up with white facing up.',
        [],
        liftFromMiddle(s, slot),
      )
    } else if (a === 'U') {
      // White faces out on side c: one turn of c drops the edge into the middle layer.
      const drop: Move = { face: c, turns: 1 }
      const dropped = applyMoves(s, [drop])
      b.add(
        'daisy',
        'Edge on top, white facing out',
        'Turn its side once to drop the edge into the middle layer, then lift it back up with white facing up.',
        [],
        [drop, ...liftFromMiddle(dropped, middleSlot(dropped, s, slot))],
      )
    } else {
      // On the bottom with white facing out on side c.
      const free = freeAbove(s, c)
      const turn: Move = { face: c, turns: 1 }
      const raised = applyMoves(s, [...free, turn])
      b.add(
        'daisy',
        'Edge on the bottom, white facing out',
        'Turn its side once to bring the edge into the middle layer, then lift it up with white facing up.',
        [],
        [...free, turn, ...liftFromMiddle(raised, middleSlot(raised, s, slot))],
      )
    }
  }
}

/** Where the edge that was in `slot` of `before` sits now. */
function middleSlot(now: string, before: string, slot: EdgeSlot): EdgeSlot {
  const [a, c] = slotFaces(slot)
  return findEdge(now, sticker(before, slot, a), sticker(before, slot, c))
}

export function cross(b: StepBuilder): void {
  for (let count = 0; ; count++) {
    const s = b.state
    const petal = (['UF', 'UR', 'UB', 'UL'] as EdgeSlot[]).find((e) => isPetal(s, e))
    if (!petal) return
    if (count >= 4) throw new UnsolvableError('cross')
    const colour = sticker(s, petal, petal[1] as Face)
    const lined = (t: string) => {
      const at = findEdge(t, white(t), colour)
      return sticker(t, at, at[1] as Face) === centre(t, at[1] as Face)
    }
    const setup = turnsUntil(s, 'U', lined)
    const at = findEdge(applyMoves(s, setup), white(s), colour)
    b.add(
      'cross',
      `${capitalise(COLOUR_NAMES[colour])} edge`,
      'Line the edge up with its matching centre, then turn that side twice to bring it down next to the white centre.',
      setup,
      [{ face: at[1] as Face, turns: 2 }],
    )
  }
}

const SEXY_MOVE: Move[] = [
  { face: 'R', turns: 1 },
  { face: 'U', turns: 1 },
  { face: 'R', turns: 3 },
  { face: 'U', turns: 3 },
]

function solvedIn(s: string, slot: CornerSlot): boolean {
  return slotFaces(slot).every((f) => sticker(s, slot, f) === centre(s, f))
}

function cornerColours(s: string, slot: CornerSlot): [string, string, string] {
  const [a, c, d] = slotFaces(slot)
  return [sticker(s, slot, a), sticker(s, slot, c), sticker(s, slot, d)]
}

export function whiteCorners(b: StepBuilder): void {
  for (let count = 0; ; count++) {
    const s = b.state
    if (firstLayerDone(s)) return
    if (count >= 8) throw new UnsolvableError('corners')
    const onTop = CORNER_SLOTS.find((c) => c[0] === 'U' && hasWhite(s, c))
    if (onTop) {
      const colours = cornerColours(s, onTop)
      const others = colours.filter((c) => c !== white(s)).sort().join('')
      const turnToSlot = turnsUntil(s, 'y', (t) => [centre(t, 'F'), centre(t, 'R')].sort().join('') === others)
      const held = applyMoves(s, turnToSlot)
      const above = turnsUntil(held, 'U', (t) => findCorner(t, ...colours) === 'UFR')
      const ready = applyMoves(held, above)
      const repeat = [1, 2, 3, 4, 5].find((n) => solvedIn(applyMoves(ready, Array(n).fill(SEXY_MOVE).flat()), 'DFR'))
      if (!repeat) throw new UnsolvableError('corners')
      b.add(
        'corners',
        'Corner on top',
        "Hold the corner's slot at front-right with the corner above it, then repeat R U R' U' until the white sticker faces down.",
        [...turnToSlot, ...above],
        SEXY_MOVE,
        repeat,
      )
    } else {
      const stuck = CORNER_SLOTS.find((c) => c[0] === 'D' && !solvedIn(s, c))
      if (!stuck) throw new UnsolvableError('corners')
      const colours = cornerColours(s, stuck)
      b.add(
        'corners',
        'Corner stuck in the bottom',
        "This corner is in the wrong spot or twisted. One R U R' U' lifts it to the top so it can be placed.",
        turnsUntil(s, 'y', (t) => findCorner(t, ...colours) === 'DFR'),
        SEXY_MOVE,
      )
    }
  }
}
