'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { buildMeadow } from './buildMeadow'
import type { Tier } from './quality'
import type { WindUniforms } from './wind'

interface MeadowProps {
  tier: Tier
  seed: number
  /** 0 turns the wind off (reduced motion), 1 is full strength. */
  windStrength: number
}

export function Meadow({ tier, seed, windStrength }: MeadowProps) {
  const uniforms = useMemo<WindUniforms>(() => ({ uTime: { value: 0 }, uStrength: { value: windStrength } }), [])
  const meadow = useMemo(() => buildMeadow(tier, seed, uniforms), [tier, seed, uniforms])

  useEffect(() => {
    uniforms.uStrength.value = windStrength
  }, [windStrength, uniforms])

  useEffect(() => () => meadow.dispose(), [meadow])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
  })

  return <primitive object={meadow.group} />
}
