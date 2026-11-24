import type { RGB } from './colour'

/** The scan grid: a centred square, 60% of the frame's short side. */
export function gridRect(width: number, height: number): { x: number; y: number; size: number } {
  const size = Math.floor(0.6 * Math.min(width, height))
  return { x: Math.floor((width - size) / 2), y: Math.floor((height - size) / 2), size }
}

/** Average colour of the central half of each cell of `rect` (default: the centred guide), row by row, from RGBA pixels. */
export function sampleGrid(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  rect: { x: number; y: number; size: number } = gridRect(width, height),
): RGB[] {
  const { x, y, size } = rect
  const cell = size / 3
  const result: RGB[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x0 = Math.floor(x + c * cell + cell / 4)
      const x1 = Math.floor(x + c * cell + (3 * cell) / 4)
      const y0 = Math.floor(y + r * cell + cell / 4)
      const y1 = Math.floor(y + r * cell + (3 * cell) / 4)
      const sum = [0, 0, 0]
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const i = (py * width + px) * 4
          sum[0] += pixels[i]
          sum[1] += pixels[i + 1]
          sum[2] += pixels[i + 2]
        }
      }
      const n = (x1 - x0) * (y1 - y0)
      result.push([sum[0] / n, sum[1] / n, sum[2] / n])
    }
  }
  return result
}
