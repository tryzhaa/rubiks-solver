import { mulberry32 } from './random'

export type FlowerKind = 'daisy' | 'spike' | 'sunflower' | 'puff'

export interface FlowerInstance {
  kind: FlowerKind
  x: number
  z: number
  height: number
  scale: number
  tiltX: number
  tiltZ: number
  yaw: number
  colorIndex: number
}

interface FlowerSpec {
  height: [number, number]
  scale: [number, number]
  palette: number[]
}

/** Values from the approved prototype after the "tone it down" pass (soft pastels). */
export const FLOWER_SPECS: Record<FlowerKind, FlowerSpec> = {
  daisy: {
    height: [0.8, 1.9],
    scale: [0.8, 1.4],
    palette: [0xee6fa0, 0xefa04c, 0xf0d263, 0x7090ee, 0x9d7edc, 0xe5676f, 0xffffff],
  },
  spike: {
    height: [1.0, 2.2],
    scale: [0.8, 1.2],
    palette: [0x8a6ad8, 0x6c84dc, 0xb070d4, 0xe07eac],
  },
  sunflower: {
    height: [1.7, 2.5],
    scale: [0.9, 1.3],
    palette: [0xf0c030, 0xe8b030],
  },
  puff: {
    height: [0.5, 1.1],
    scale: [0.9, 1.3],
    palette: [0xe87cb2, 0xc67cd8, 0xee8a72],
  },
}

export const MEADOW_RADIUS = 27

const KIND_ORDER: FlowerKind[] = ['daisy', 'spike', 'sunflower', 'puff']

export function generateFlowers(counts: Record<FlowerKind, number>, seed: number): FlowerInstance[] {
  const rng = mulberry32(seed)
  const between = (lo: number, hi: number) => lo + rng() * (hi - lo)
  const out: FlowerInstance[] = []

  KIND_ORDER.forEach((kind, kindIndex) => {
    const spec = FLOWER_SPECS[kind]
    const paletteLength = spec.palette.length
    for (let i = 0; i < counts[kind]; i++) {
      const angle = between(0, Math.PI * 2)
      const dist = Math.pow(rng(), 0.65) * MEADOW_RADIUS
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      // Smooth noise makes neighbouring flowers share a colour (patches); 22% are random.
      const noise = Math.sin(x * 0.2 + kindIndex * 3) + Math.cos(z * 0.17 + kindIndex) + Math.sin((x + z) * 0.1)
      const patch = Math.min(paletteLength - 1, Math.max(0, Math.floor(((noise + 3) * paletteLength) / 6)))
      const colorIndex = rng() < 0.78 ? patch : Math.floor(rng() * paletteLength)
      const upright = kind === 'spike'
      out.push({
        kind,
        x,
        z,
        height: between(spec.height[0], spec.height[1]),
        scale: between(spec.scale[0], spec.scale[1]),
        tiltX: upright ? 0 : between(-0.5, 0.5),
        tiltZ: upright ? 0 : between(-0.5, 0.5),
        yaw: between(0, Math.PI * 2),
        colorIndex,
      })
    }
  })
  return out
}
