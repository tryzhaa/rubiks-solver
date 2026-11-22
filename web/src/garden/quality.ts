import type { FlowerKind } from './layout/flowers'

export type Tier = 'high' | 'low'

export interface QualityCounts {
  grass: number
  butterflies: number
  flowers: Record<FlowerKind, number>
}

const HIGH: QualityCounts = {
  grass: 24000,
  butterflies: 7,
  flowers: { daisy: 650, spike: 280, sunflower: 45, puff: 130 },
}

export function countsFor(tier: Tier): QualityCounts {
  if (tier === 'high') return { ...HIGH, flowers: { ...HIGH.flowers } }
  const scale = (n: number) => Math.round(n * 0.4)
  return {
    grass: 6000,
    butterflies: 4,
    flowers: {
      daisy: scale(HIGH.flowers.daisy),
      spike: scale(HIGH.flowers.spike),
      sunflower: scale(HIGH.flowers.sunflower),
      puff: scale(HIGH.flowers.puff),
    },
  }
}

export function detectTier(env: { hardwareConcurrency?: number; deviceMemory?: number; isMobile: boolean }): Tier {
  if (!env.isMobile) return 'high'
  const fewCores = env.hardwareConcurrency !== undefined && env.hardwareConcurrency <= 4
  const lowMemory = env.deviceMemory !== undefined && env.deviceMemory <= 4
  return fewCores || lowMemory ? 'low' : 'high'
}
