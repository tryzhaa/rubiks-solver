'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type * as THREE from 'three'
import { mulberry32 } from './layout/random'

interface Puff {
  radius: number
  position: [number, number, number]
  shaded: boolean
}
interface CloudData {
  position: [number, number, number]
  scale: number
  puffs: Puff[]
}

const COUNT = 14
const WRAP_X = 110

function generateClouds(seed: number): CloudData[] {
  const rng = mulberry32(seed)
  const between = (lo: number, hi: number) => lo + rng() * (hi - lo)
  return Array.from({ length: COUNT }, () => ({
    position: [between(-90, 90), between(26, 44), between(-95, -25)] as [number, number, number],
    scale: between(0.9, 1.6),
    puffs: Array.from({ length: 8 }, (_, j) => {
      const shaded = j < 3
      return {
        radius: between(3, 5.5),
        position: [j * 3.6 - 12, shaded ? -1.2 : between(0, 1.8), between(-2, 2)] as [number, number, number],
        shaded,
      }
    }),
  }))
}

/** Flat-bottomed cumulus clouds that drift slowly and wrap around. */
export function Clouds({ seed = 11, drift = 0.8 }: { seed?: number; drift?: number }) {
  const clouds = useMemo(() => generateClouds(seed), [seed])
  const refs = useRef<(THREE.Group | null)[]>([])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    refs.current.forEach((g) => {
      if (!g) return
      g.position.x += dt * drift
      if (g.position.x > WRAP_X) g.position.x = -WRAP_X
    })
  })

  return (
    <>
      {clouds.map((cloud, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g
          }}
          position={cloud.position}
          scale={cloud.scale}
        >
          {cloud.puffs.map((p, j) => (
            <mesh key={j} position={p.position} scale={[1, 0.6, 1]}>
              <sphereGeometry args={[p.radius, 10, 8]} />
              <meshBasicMaterial color={p.shaded ? 0xdfe9f7 : 0xffffff} fog={false} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}
