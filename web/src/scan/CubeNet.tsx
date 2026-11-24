'use client'

import type { Face } from '@/cube/moves'
import { LETTERS, STICKER_HEX } from './faces'
import styles from './scanner.module.css'
import { COLOUR_WORDS } from './validate'

const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']
/** Top-left cell (row, column) of each face in the unfolded cross. */
const NET_ORIGIN: Record<Face, [number, number]> = { U: [0, 3], L: [3, 0], F: [3, 3], R: [3, 6], B: [3, 9], D: [6, 3] }
const CENTRES = [4, 13, 22, 31, 40, 49]
const capitalise = (w: string) => w[0].toUpperCase() + w.slice(1)

interface CubeNetProps {
  state: string
  marked: number[]
  selected: number | null
  onPick: (index: number) => void
}

/** The cube unfolded flat; each sticker is a button showing its letter. Centres are fixed. */
export function CubeNet({ state, marked, selected, onPick }: CubeNetProps) {
  return (
    <div className={styles.net}>
      {FACES.flatMap((face, f) =>
        Array.from({ length: 9 }, (_, k) => {
          const index = f * 9 + k
          const letter = state[index] as Face
          const [row, col] = NET_ORIGIN[face]
          const classes = [
            styles.sticker,
            marked.includes(index) ? styles.marked : '',
            selected === index ? styles.selected : '',
          ]
          return (
            <button
              key={index}
              type="button"
              className={classes.join(' ')}
              style={{
                gridRow: row + Math.floor(k / 3) + 1,
                gridColumn: col + (k % 3) + 1,
                background: STICKER_HEX[letter],
              }}
              disabled={CENTRES.includes(index)}
              aria-label={`${capitalise(COLOUR_WORDS[face])} face, row ${Math.floor(k / 3) + 1}, column ${(k % 3) + 1}: ${COLOUR_WORDS[letter]}`}
              aria-pressed={selected === index}
              onClick={() => onPick(index)}
            >
              {LETTERS[letter]}
            </button>
          )
        }),
      )}
    </div>
  )
}
