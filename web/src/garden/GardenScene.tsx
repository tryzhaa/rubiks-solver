'use client'

import { OrbitControls, useCursor } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { CubeViewer } from '@/cube/CubeViewer'
import type { Move } from '@/cube/moves'
import type { PlayerHandle } from '@/cube/usePlayer'
import { Butterflies } from './Butterflies'
import { Environment } from './Environment'
import { Meadow } from './Meadow'
import { BASE_FOV, fovForAspect } from './framing'
import { CameraProp, Signpost } from './Props'
import type { HotspotKey } from './hotspots'
import { type Tier, countsFor } from './quality'

export interface GardenSceneProps {
  tier: Tier
  seed: number
  /** Reduced motion: no wind, still butterflies. */
  reducedMotion: boolean
  moves: Move[]
  startMoves: Move[]
  player: PlayerHandle
  onHotspot: (key: HotspotKey) => void
  onContextLost: () => void
}

function ClickableCube({ moves, startMoves, player, onHotspot }: Pick<GardenSceneProps, 'moves' | 'startMoves' | 'player' | 'onHotspot'>) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        onHotspot('cube')
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <CubeViewer moves={moves} startMoves={startMoves} player={player} />
    </group>
  )
}

/** Widens the view on portrait screens so the garden props stay in frame. */
function ResponsiveFov() {
  const get = useThree((s) => s.get)
  const aspect = useThree((s) => s.size.width / s.size.height)
  useEffect(() => {
    const { camera } = get()
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    camera.fov = fovForAspect(aspect)
    camera.updateProjectionMatrix()
  }, [get, aspect])
  return null
}

export default function GardenScene(props: GardenSceneProps) {
  const { tier, seed, reducedMotion, moves, startMoves, player, onHotspot, onContextLost } = props
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [9, 2, 13], fov: BASE_FOV, near: 0.1, far: 300 }}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          onContextLost()
        })
      }}
    >
      <ResponsiveFov />
      <Environment />
      <Meadow tier={tier} seed={seed} windStrength={reducedMotion ? 0 : 1} />
      <ClickableCube moves={moves} startMoves={startMoves} player={player} onHotspot={onHotspot} />
      <CameraProp onHotspot={onHotspot} />
      <Signpost onHotspot={onHotspot} />
      <Butterflies count={countsFor(tier).butterflies} seed={seed} still={reducedMotion} onHotspot={onHotspot} />
      <OrbitControls
        makeDefault
        target={[0, 3.2, 0]}
        enableDamping
        maxPolarAngle={Math.PI * 0.5}
        minDistance={4}
        maxDistance={22}
      />
    </Canvas>
  )
}
