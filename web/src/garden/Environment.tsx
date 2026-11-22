'use client'

import { useMemo } from 'react'
import { Clouds } from './Clouds'
import { HORIZON_COLOR, SUN_POSITION, Sky } from './Sky'
import { Trees } from './Trees'
import { mulberry32 } from './layout/random'

interface Hill {
  position: [number, number, number]
  radius: number
  color: number
}

function generateHills(seed: number): Hill[] {
  const rng = mulberry32(seed)
  const between = (lo: number, hi: number) => lo + rng() * (hi - lo)
  return Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * Math.PI * 2 + between(-0.1, 0.1)
    const dist = between(48, 62)
    const radius = between(10, 20)
    return {
      position: [Math.cos(angle) * dist, -radius * 0.45, Math.sin(angle) * dist] as [number, number, number],
      radius,
      color: i % 2 ? 0x3f9a3a : 0x57b349,
    }
  })
}

/**
 * Lights, sky, fog, ground, distant hills, clouds and trees.
 * Light intensities are in three.js physical units (the prototype used legacy units, roughly /PI).
 */
export function Environment() {
  const hills = useMemo(() => generateHills(7), [])

  return (
    <>
      <fog attach="fog" args={[HORIZON_COLOR, 30, 80]} />
      <hemisphereLight args={[0xbfe0ff, 0x6fbf4a, 2.7]} />
      <directionalLight
        position={SUN_POSITION}
        color={0xfff0cf}
        intensity={4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
      />
      <Sky />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[70, 48]} />
        <meshStandardMaterial color={0x3fae35} roughness={1} />
      </mesh>
      {hills.map((h, i) => (
        <mesh key={i} position={h.position} scale={[1, 0.6, 1]}>
          <icosahedronGeometry args={[h.radius, 1]} />
          <meshStandardMaterial color={h.color} flatShading roughness={1} />
        </mesh>
      ))}
      <Trees />
      <Clouds />
    </>
  )
}
