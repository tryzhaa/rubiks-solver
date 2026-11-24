import type { RGB } from './colour'

/** Camera-like sticker colours for tests, by face letter. */
export const PALETTE: Record<string, RGB> = {
  U: [235, 235, 230],
  D: [230, 210, 40],
  R: [190, 30, 40],
  L: [240, 110, 30],
  F: [30, 160, 70],
  B: [20, 70, 190],
}

export const paint = (state: string): RGB[] => state.split('').map((c) => PALETTE[c])
