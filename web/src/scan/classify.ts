import { type Lab, type RGB, labDistance, rgbToLab } from './colour'

const FACES = ['U', 'R', 'F', 'D', 'L', 'B']
const CENTRES = [4, 13, 22, 31, 40, 49]
/** Non-centre stickers per colour. */
const CAPACITY = 8

export interface Classification {
  /** Facelet string, nine of each letter. */
  state: string
  /** Per sticker: how much closer the chosen colour is than the next best (ΔE); Infinity for centres. */
  confidence: number[]
}

/** Balanced greedy assignment: closest (sticker, colour) pairs first, at most eight non-centre stickers per colour. */
function assign(labs: Lab[], refs: Lab[]): number[] {
  const pairs: { sticker: number; colour: number; d: number }[] = []
  labs.forEach((lab, sticker) => {
    if (CENTRES.includes(sticker)) return
    refs.forEach((ref, colour) => pairs.push({ sticker, colour, d: labDistance(lab, ref) }))
  })
  pairs.sort((a, b) => a.d - b.d)
  const result = labs.map((_, i) => (CENTRES.includes(i) ? CENTRES.indexOf(i) : -1))
  const used = refs.map(() => 0)
  for (const { sticker, colour } of pairs) {
    if (result[sticker] !== -1 || used[colour] >= CAPACITY) continue
    result[sticker] = colour
    used[colour]++
  }
  return result
}

function mean(labs: Lab[]): Lab {
  const sum = labs.reduce<Lab>((s, l) => [s[0] + l[0], s[1] + l[1], s[2] + l[2]], [0, 0, 0])
  return [sum[0] / labs.length, sum[1] / labs.length, sum[2] / labs.length]
}

/**
 * Names each of 54 samples (facelet order U R F D L B) after the face whose centre it matches.
 * Pass 1 compares with the six centre samples; pass 2 with the mean of each colour's nine stickers.
 */
export function classify(samples: RGB[]): Classification {
  const labs = samples.map(rgbToLab)
  const first = assign(labs, CENTRES.map((i) => labs[i]))
  const refs = FACES.map((_, colour) => mean(labs.filter((_, i) => first[i] === colour)))
  const second = assign(labs, refs)
  const confidence = labs.map((lab, i) => {
    if (CENTRES.includes(i)) return Infinity
    const [best, next] = refs.map((ref) => labDistance(lab, ref)).sort((a, b) => a - b)
    return next - best
  })
  return { state: second.map((c) => FACES[c]).join(''), confidence }
}
