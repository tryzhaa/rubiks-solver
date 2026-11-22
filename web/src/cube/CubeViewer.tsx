'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { roundedBoxGeometry, stickerGeometry } from './cubeGeometry'
import { cubieInLayer, layerTurn } from './layers'
import type { Move } from './moves'
import { type Cubie, applyTurn, createCubies, cubiePosition, easeInOutQuad, poseAfter } from './pose'
import type { PlayerHandle } from './usePlayer'

/** Sticker colours for faces R, L, U, D, F, B. */
const FACE_COLORS = [0xff1f2d, 0xff6a00, 0xfafafa, 0xffe000, 0x00c853, 0x0a55ff]
/** [rotation about x, rotation about y] that turns a +z-facing sticker onto R, L, U, D, F, B. */
const FACE_ROTATIONS: [number, number][] = [
  [0, Math.PI / 2],
  [0, -Math.PI / 2],
  [-Math.PI / 2, 0],
  [Math.PI / 2, 0],
  [0, 0],
  [0, Math.PI],
]
const NO_MOVES: Move[] = []

function exposedFaces(home: [number, number, number]): number[] {
  const faces: number[] = []
  if (home[0] === 1) faces.push(0)
  if (home[0] === -1) faces.push(1)
  if (home[1] === 1) faces.push(2)
  if (home[1] === -1) faces.push(3)
  if (home[2] === 1) faces.push(4)
  if (home[2] === -1) faces.push(5)
  return faces
}

interface CubeViewerProps {
  moves: Move[]
  /** Applied instantly before playback begins, e.g. a scramble. Keep the array identity stable. */
  startMoves?: Move[]
  player: PlayerHandle
  onStep?: (index: number) => void
  position?: [number, number, number]
}

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) }

export function CubeViewer({ moves, startMoves = NO_MOVES, player, onStep, position = [0, 4.4, 0] }: CubeViewerProps) {
  const home = useMemo(() => createCubies(), [])
  const root = useRef<THREE.Group>(null)
  const groups = useRef<(THREE.Group | null)[]>([])
  const base = useRef<{ cubies: Cubie[]; moves: Move[] | null; startMoves: Move[] | null; index: number }>({
    cubies: home,
    moves: null,
    startMoves: null,
    index: -1,
  })

  const { bodyGeometry, stickerGeo, faceMaterials, bodyMaterial } = useMemo(
    () => ({
      bodyGeometry: roundedBoxGeometry(0.97, 0.1, 14),
      stickerGeo: stickerGeometry(),
      faceMaterials: FACE_COLORS.map(
        (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04 }),
      ),
      bodyMaterial: new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.3, clearcoat: 0.8 }),
    }),
    [],
  )

  useEffect(
    () => () => {
      bodyGeometry.dispose()
      stickerGeo.dispose()
      faceMaterials.forEach((m) => m.dispose())
      bodyMaterial.dispose()
    },
    [bodyGeometry, stickerGeo, faceMaterials, bodyMaterial],
  )

  const rotation = useMemo(() => new THREE.Matrix4(), [])

  useFrame(({ clock }, delta) => {
    const state = player.ref.current
    const b = base.current

    const sameSequence = b.moves === moves && b.startMoves === startMoves
    if (sameSequence && b.index === state.index - 1 && b.index >= 0 && state.index <= moves.length) {
      // Normal forward playback: fold the finished move into the resting pose.
      applyTurn(b.cubies, layerTurn(moves[b.index]))
      b.index = state.index
      onStep?.(state.index)
    } else if (!sameSequence || b.index !== state.index) {
      // Sequence replaced or the user jumped (prev, restart): rebuild the pose from scratch.
      b.cubies = poseAfter([...startMoves, ...moves.slice(0, state.index)])
      b.moves = moves
      b.startMoves = startMoves
      b.index = state.index
      onStep?.(state.index)
    }

    player.dispatch({ type: 'tick', dt: delta, moveCount: moves.length })

    const turning = state.index < moves.length && state.progress > 0 ? layerTurn(moves[state.index]) : null
    if (turning) {
      rotation.makeRotationAxis(
        AXES[turning.axis],
        (turning.quarterTurns * Math.PI * easeInOutQuad(state.progress)) / 2,
      )
    }
    b.cubies.forEach((cubie, i) => {
      const group = groups.current[i]
      if (!group) return
      if (turning && cubieInLayer(cubiePosition(cubie), turning)) {
        group.matrix.multiplyMatrices(rotation, cubie.matrix)
      } else {
        group.matrix.copy(cubie.matrix)
      }
      group.matrixWorldNeedsUpdate = true
    })

    if (root.current) root.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.1) * 0.2
  })

  return (
    <group ref={root} position={position} scale={1.2}>
      {home.map((cubie, i) => (
        <group
          key={cubie.home.join(',')}
          matrixAutoUpdate={false}
          ref={(g) => {
            groups.current[i] = g
            if (g) {
              g.matrix.copy(cubie.matrix)
              g.matrixWorldNeedsUpdate = true
            }
          }}
        >
          <mesh geometry={bodyGeometry} material={bodyMaterial} castShadow receiveShadow />
          {exposedFaces(cubie.home).map((face) => (
            <mesh
              key={face}
              geometry={stickerGeo}
              material={faceMaterials[face]}
              rotation={[FACE_ROTATIONS[face][0], FACE_ROTATIONS[face][1], 0]}
              castShadow
            />
          ))}
        </group>
      ))}
    </group>
  )
}
