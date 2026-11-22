'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { buildMeadow } from './buildMeadow'
import type { Tier } from './quality'

interface MeadowProps {
  tier: Tier
  seed: number
  /** 0 turns the wind off (reduced motion), 1 is full strength. */
  windStrength: number
}

export function Meadow({ tier, seed, windStrength }: MeadowProps) {
  const meadow = useMemo(() => buildMeadow(tier, seed), [tier, seed])

  useEffect(() => () => meadow.dispose(), [meadow])

  useFrame(({ clock }) => {
    meadow.setWind(clock.elapsedTime, windStrength)
  })

  return <primitive object={meadow.group} />
}
