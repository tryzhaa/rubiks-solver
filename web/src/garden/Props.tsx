'use client'

import { RoundedBox, useCursor } from '@react-three/drei'
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

const TRIPOD_HEIGHT = 1.7
const LEG_SPREAD = 0.55
const LEG_LENGTH = Math.hypot(TRIPOD_HEIGHT, LEG_SPREAD)
const LEG_TILT = Math.atan(LEG_SPREAD / TRIPOD_HEIGHT)

/** Scan hotspot: a chunky toy camera on a tripod, lens pointed at the cube, raised above the flowers. */
export function CameraProp({ onHotspot }: { onHotspot: (key: HotspotKey) => void }) {
  const handlers = useHotspot('camera', onHotspot)
  return (
    <group position={[-3.0, 0, 2.8]} rotation={[0, 1.75, 0]} scale={1.15} {...handlers}>
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0, TRIPOD_HEIGHT / 2, LEG_SPREAD / 2]} rotation={[-LEG_TILT, 0, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, LEG_LENGTH, 6]} />
            <meshStandardMaterial color={0x55556a} {...METAL} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, TRIPOD_HEIGHT + 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.14, 10]} />
        <meshStandardMaterial color={0x55556a} {...METAL} />
      </mesh>
      {/* Body tilts up a little so the lens looks at the floating cube. */}
      <group position={[0, TRIPOD_HEIGHT + 0.48, 0]} rotation={[-0.25, 0, 0]}>
        <RoundedBox args={[1.15, 0.72, 0.55]} radius={0.14} smoothness={4} castShadow receiveShadow>
          <meshPhysicalMaterial color={0xf2667a} roughness={0.35} clearcoat={0.6} />
        </RoundedBox>
        <RoundedBox args={[1.17, 0.2, 0.57]} radius={0.06} smoothness={3} position={[0, -0.18, 0]}>
          <meshStandardMaterial color={0xfff1d6} roughness={0.7} />
        </RoundedBox>
        <RoundedBox args={[0.4, 0.2, 0.36]} radius={0.06} smoothness={3} position={[-0.28, 0.42, 0]} castShadow>
          <meshPhysicalMaterial color={0xf2667a} roughness={0.35} clearcoat={0.6} />
        </RoundedBox>
        <mesh position={[0.34, 0.41, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.1, 14]} />
          <meshStandardMaterial color={0xffd23f} roughness={0.4} />
        </mesh>
        <mesh position={[0.36, 0.2, 0.28]}>
          <boxGeometry args={[0.22, 0.12, 0.03]} />
          <meshStandardMaterial color={0xffffff} emissive={0xfff6c8} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.27, 0.3, 0.32, 20]} />
          <meshStandardMaterial color={0x2b2b3a} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.58]}>
          <torusGeometry args={[0.25, 0.04, 8, 24]} />
          <meshStandardMaterial color={0xfff1d6} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.585]}>
          <circleGeometry args={[0.21, 24]} />
          <meshPhysicalMaterial color={0x4a7dff} roughness={0.08} clearcoat={1} metalness={0.2} />
        </mesh>
      </group>
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
