/** A camera colour, each channel 0–255. */
export type RGB = [number, number, number]
export type Lab = [number, number, number]

const toLinear = (v: number) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)

/** sRGB to CIE Lab with a D65 white point. */
export function rgbToLab([r8, g8, b8]: RGB): Lab {
  const [r, g, b] = [toLinear(r8), toLinear(g8), toLinear(b8)]
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const [fx, fy, fz] = [f(x), f(y), f(z)]
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function labDistance(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** CIE76 colour difference (ΔE) between two camera colours. */
export function colourDistance(a: RGB, b: RGB): number {
  return labDistance(rgbToLab(a), rgbToLab(b))
}
