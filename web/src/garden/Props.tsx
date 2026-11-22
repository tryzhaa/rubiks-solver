'use client'

import { useCursor } from '@react-three/drei'
import { useState } from 'react'
import type { HotspotKey } from './hotspots'

const METAL = { metalness: 0.5, roughness: 0.35 }

function useHotspot(key: HotspotKey, onHotspot: (key: HotspotKey) => void) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  return {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      onHotspot(key)
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      setHovered(true)
    },
    onPointerOut: () => setHovered(false),
  }
}

/** Scan hotspot. */
export function WateringCan({ onHotspot }: { onHotspot: (key: HotspotKey) => void }) {
  const handlers = useHotspot('can', onHotspot)
  return (
    <group position={[-4.6, 0, 3.4]} rotation={[0, 0.6, 0]} scale={1.2} {...handlers}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.8, 16]} />
        <meshStandardMaterial color={0x2f93e8} {...METAL} />
      </mesh>
      <mesh position={[0.8, 0.65, 0]} rotation={[0, 0, -0.9]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 0.95, 8]} />
        <meshStandardMaterial color={0x1f78c5} {...METAL} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <torusGeometry args={[0.38, 0.05, 8, 16, Math.PI]} />
        <meshStandardMaterial color={0x1f78c5} {...METAL} />
      </mesh>
    </group>
  )
}

/** Technique guide and saved solves hotspot. */
export function Signpost({ onHotspot }: { onHotspot: (key: HotspotKey) => void }) {
  const handlers = useHotspot('sign', onHotspot)
  return (
    <group position={[5.2, 0, 2.6]} rotation={[0, -0.7, 0]} {...handlers}>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 2.4, 0.2]} />
        <meshStandardMaterial color={0x7a5230} roughness={0.9} />
      </mesh>
      <mesh position={[0.2, 2.0, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.45, 0.1]} />
        <meshStandardMaterial color={0xe3b873} roughness={0.8} />
      </mesh>
      <mesh position={[-0.2, 1.4, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.45, 0.1]} />
        <meshStandardMaterial color={0xe3b873} roughness={0.8} />
      </mesh>
    </group>
  )
}
