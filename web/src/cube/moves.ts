export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B'

/** turns: 1 = clockwise quarter, 2 = half turn, 3 = counter-clockwise quarter. */
export type Move = { face: Face; turns: 1 | 2 | 3 }

const FACES: readonly string[] = ['U', 'D', 'L', 'R', 'F', 'B']
const TOKEN = /^([UDLRFB])(['2]?)$/

export function parseMoves(text: string): Move[] {
  const tokens = text.split(/\s+/).filter(Boolean)
  return tokens.map((token) => {
    const match = TOKEN.exec(token)
    if (!match || !FACES.includes(match[1])) {
      throw new Error(`Invalid move token: ${token}`)
    }
    const turns = match[2] === "'" ? 3 : match[2] === '2' ? 2 : 1
    return { face: match[1] as Face, turns }
  })
}

export function formatMove(m: Move): string {
  return m.face + (m.turns === 3 ? "'" : m.turns === 2 ? '2' : '')
}

export function invertMove(m: Move): Move {
  return { face: m.face, turns: m.turns === 1 ? 3 : m.turns === 3 ? 1 : 2 }
}

export function invertMoves(ms: Move[]): Move[] {
  return [...ms].reverse().map(invertMove)
}
