import { type Face, parseMoves } from '@/cube/moves'
import { applyMoves } from '@/cube/state'
import { middleDone } from '../goals'
import { type EdgeSlot, centre, findEdge, slotFaces, sticker } from '../pieces'
import { type StepBuilder, UnsolvableError, turnsUntil } from '../step'

const RIGHT_INSERT = parseMoves("U R U' R' U' F' U F")
const LEFT_INSERT = parseMoves("U' L' U L U F U' F'")
const U_EDGES: EdgeSlot[] = ['UF', 'UR', 'UB', 'UL']
const MIDDLE_EDGES: EdgeSlot[] = ['FR', 'FL', 'BR', 'BL']

const edgeColours = (s: string, slot: EdgeSlot) => slotFaces(slot).map((f) => sticker(s, slot, f)) as [string, string]

function solvedIn(s: string, slot: EdgeSlot): boolean {
  return slotFaces(slot).every((f) => sticker(s, slot, f) === centre(s, f))
}

export function middleLayer(b: StepBuilder): void {
  for (let count = 0; ; count++) {
    const s = b.state
    if (middleDone(s)) return
    if (count >= 12) throw new UnsolvableError('middle')
    const yellow = centre(s, 'U')
    const onTop = U_EDGES.find((e) => edgeColours(s, e).every((c) => c !== yellow))
    if (onTop) {
      const top = sticker(s, onTop, 'U')
      const side = sticker(s, onTop, onTop[1] as Face)
      const turn = turnsUntil(s, 'y', (t) => centre(t, 'F') === side)
      const held = applyMoves(s, turn)
      const line = turnsUntil(held, 'U', (t) => findEdge(t, top, side) === 'UF' && sticker(t, 'UF', 'F') === side)
      const ready = applyMoves(held, line)
      if (top === centre(ready, 'R')) {
        b.add(
          'middle',
          'Edge goes right',
          'Line the edge up with its front centre. Its top colour matches the right centre, so use the right-hand insert.',
          [...turn, ...line],
          RIGHT_INSERT,
        )
      } else if (top === centre(ready, 'L')) {
        b.add(
          'middle',
          'Edge goes left',
          'Line the edge up with its front centre. Its top colour matches the left centre, so use the left-hand insert.',
          [...turn, ...line],
          LEFT_INSERT,
        )
      } else {
        throw new UnsolvableError('middle')
      }
    } else {
      const stuck = MIDDLE_EDGES.find((e) => !solvedIn(s, e))
      if (!stuck) throw new UnsolvableError('middle')
      const colours = edgeColours(s, stuck)
      b.add(
        'middle',
        'Edge stuck in the middle',
        'This edge is in the wrong slot or flipped. One right-hand insert pops it out to the top layer.',
        turnsUntil(s, 'y', (t) => findEdge(t, ...colours) === 'FR'),
        RIGHT_INSERT,
      )
    }
  }
}
