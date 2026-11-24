import { type Face, type Move, parseMoves } from '@/cube/moves'
import { applyMoves } from '@/cube/state'
import { type EdgeSlot, centre, sticker } from '../pieces'
import { type StepBuilder, UnsolvableError, turnsUntil } from '../step'

const U_EDGES: EdgeSlot[] = ['UF', 'UR', 'UB', 'UL']
const CROSS_ALG = parseMoves("F R U R' U' F'")
const EDGE_SWAP = parseMoves("R U R' U R U2 R' U")

const yellowUp = (s: string) => U_EDGES.filter((e) => sticker(s, e, 'U') === centre(s, 'U'))
const sideOf = (e: EdgeSlot) => e[1] as Face
const edgesMatching = (s: string) => U_EDGES.filter((e) => sticker(s, e, sideOf(e)) === centre(s, sideOf(e)))
const sameSet = (a: EdgeSlot[], b: EdgeSlot[]) => a.length === b.length && a.every((e) => b.includes(e))
const OPPOSITE: Record<string, string> = { UF: 'UB', UB: 'UF', UR: 'UL', UL: 'UR' }

export function yellowCross(b: StepBuilder): void {
  for (let count = 0; ; count++) {
    const up = yellowUp(b.state)
    if (up.length === 4) return
    if (up.length % 2 === 1 || count >= 3) throw new UnsolvableError('yellowCross')
    if (up.length === 0) {
      b.add('yellowCross', 'Dot', "No yellow edges are up yet. One F R U R' U' F' makes an L-shape.", [], CROSS_ALG)
    } else if (OPPOSITE[up[0]] === up[1]) {
      b.add(
        'yellowCross',
        'Line',
        "Hold the line left to right, then F R U R' U' F' completes the cross.",
        turnsUntil(b.state, 'U', (t) => sameSet(yellowUp(t), ['UL', 'UR'])),
        CROSS_ALG,
      )
    } else {
      b.add(
        'yellowCross',
        'L-shape',
        "Hold the L at back-left, like 9 and 12 on a clock, then F R U R' U' F' turns it into a line.",
        turnsUntil(b.state, 'U', (t) => sameSet(yellowUp(t), ['UB', 'UL'])),
        CROSS_ALG,
      )
    }
  }
}

export function yellowEdges(b: StepBuilder): void {
  for (let count = 0; ; count++) {
    const s = b.state
    const options = [0, 1, 2, 3].map((n) => {
      const turn: Move[] = n === 0 ? [] : [{ face: 'U', turns: n as 1 | 2 | 3 }]
      return { turn, matching: edgesMatching(applyMoves(s, turn)) }
    })
    const best = options.reduce((a, o) => (o.matching.length > a.matching.length ? o : a))
    if (best.matching.length === 4) {
      b.add('yellowEdges', 'All edges match', 'Turn the top so every yellow edge matches the centre below it.', best.turn, [])
      return
    }
    if (best.matching.length < 2 || count >= 3) throw new UnsolvableError('yellowEdges')
    const [a, c] = best.matching
    if (OPPOSITE[a] === c) {
      b.add(
        'yellowEdges',
        'Two opposite match',
        "With opposite edges correct, one R U R' U R U2 R' U turns this into the neighbours case.",
        best.turn,
        EDGE_SWAP,
      )
    } else {
      const lined = applyMoves(s, best.turn)
      const hold = turnsUntil(lined, 'y', (t) => sameSet(edgesMatching(t), ['UB', 'UR']))
      b.add(
        'yellowEdges',
        'Two neighbours match',
        "Hold the two correct edges at the back and right, then R U R' U R U2 R' U swaps the other two.",
        [...best.turn, ...hold],
        EDGE_SWAP,
      )
    }
  }
}
