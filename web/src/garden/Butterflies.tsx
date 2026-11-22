'use client'

import { useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { type ButterflyKind, type FlightParams, butterflyHeading, butterflyPosition, generateButterflies } from './layout/butterflies'
import type { HotspotKey } from './hotspots'

const KINDS: ButterflyKind[] = ['monarch', 'admiral', 'swallow', 'blue']
const BASE_COLOR: Record<ButterflyKind, string> = {
  monarch: '#ff7a00',
  admiral: '#17171c',
  swallow: '#ffd400',
  blue: '#2f7bff',
}

/** Paints one right-hand wing (upper and lower lobe) on a transparent canvas. */
function wingTexture(kind: ButterflyKind): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const upper = () => {
    ctx.beginPath()
    ctx.moveTo(0, 50)
    ctx.bezierCurveTo(30, 0, 110, 5, 122, 30)
    ctx.bezierCurveTo(126, 55, 70, 62, 0, 62)
    ctx.closePath()
  }
  const lower = () => {
    ctx.beginPath()
    ctx.moveTo(0, 62)
    ctx.bezierCurveTo(60, 64, 100, 80, 92, 104)
    ctx.bezierCurveTo(80, 126, 30, 118, 0, 92)
    ctx.closePath()
  }
  for (const lobe of [upper, lower]) {
    lobe()
    ctx.fillStyle = BASE_COLOR[kind]
    ctx.fill()
    ctx.save()
    lobe()
    ctx.clip()
    if (kind === 'admiral') {
      ctx.fillStyle = '#ff2d1a'
      ctx.fillRect(40, 20, 30, 100)
    }
    if (kind === 'swallow') {
      ctx.fillStyle = '#111'
      for (let i = 0; i < 4; i++) ctx.fillRect(20 + i * 24, 0, 8, 128)
    }
    if (kind === 'monarch' || kind === 'blue') {
      ctx.strokeStyle = '#111'
      ctx.lineWidth = 2
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(0, 60)
        ctx.lineTo(125, 10 + i * 28)
        ctx.stroke()
      }
    }
    ctx.restore()
    lobe()
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 6
    ctx.stroke()
    if (kind === 'monarch' || kind === 'admiral') {
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 7; i++) {
        ctx.beginPath()
        ctx.arc(30 + i * 14, i < 4 ? 18 + Math.abs(i - 2) * 3 : 112 - i * 2, 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

interface ButterflyProps {
  params: FlightParams
  material: THREE.Material
  wingGeometry: THREE.BufferGeometry
  bodyGeometry: THREE.BufferGeometry
  bodyMaterial: THREE.Material
  /** Reduced motion: hover in place with wings half open. */
  still: boolean
  onHotspot: (key: HotspotKey) => void
}

function Butterfly({ params, material, wingGeometry, bodyGeometry, bodyMaterial, still, onHotspot }: ButterflyProps) {
  const root = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const left = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame(({ clock }) => {
    const t = still ? 0 : clock.elapsedTime
    const g = root.current
    if (!g) return
    const [x, y, z] = butterflyPosition(params, t)
    g.position.set(x, y, z)
    g.rotation.y = butterflyHeading(params, t)
    g.rotation.z = still ? 0 : Math.sin(t * 0.8 + params.ph) * 0.12
    const flap = still ? 0.6 : 0.15 + (Math.sin(t * params.flap + params.ph) * 0.5 + 0.5) * 1.05
    if (right.current) right.current.rotation.z = flap
    if (left.current) left.current.rotation.z = flap
  })

  return (
    <group
      ref={root}
      scale={params.scale}
      onClick={(e) => {
        e.stopPropagation()
        onHotspot('butterfly')
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <group ref={right}>
        <mesh geometry={wingGeometry} material={material} />
      </group>
      <group ref={left} scale={[-1, 1, 1]}>
        <mesh geometry={wingGeometry} material={material} />
      </group>
      <mesh geometry={bodyGeometry} material={bodyMaterial} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  )
}

export function Butterflies({
  count,
  seed,
  still,
  onHotspot,
}: {
  count: number
  seed: number
  still: boolean
  onHotspot: (key: HotspotKey) => void
}) {
  const flights = useMemo(() => generateButterflies(count, seed), [count, seed])
  const assets = useMemo(() => {
    const materials = Object.fromEntries(
      KINDS.map((kind) => [
        kind,
        new THREE.MeshBasicMaterial({
          map: wingTexture(kind),
          transparent: true,
          alphaTest: 0.4,
          side: THREE.DoubleSide,
          fog: false,
        }),
      ]),
    ) as Record<ButterflyKind, THREE.MeshBasicMaterial>
    const wingGeometry = new THREE.PlaneGeometry(0.6, 0.6)
    wingGeometry.rotateX(-Math.PI / 2)
    wingGeometry.translate(0.3, 0, 0)
    return {
      materials,
      wingGeometry,
      bodyGeometry: new THREE.CylinderGeometry(0.025, 0.02, 0.32, 5),
      bodyMaterial: new THREE.MeshBasicMaterial({ color: 0x111111 }),
    }
  }, [])

  useEffect(
    () => () => {
      Object.values(assets.materials).forEach((m) => {
        m.map?.dispose()
        m.dispose()
      })
      assets.wingGeometry.dispose()
      assets.bodyGeometry.dispose()
      assets.bodyMaterial.dispose()
    },
    [assets],
  )

  return (
    <>
      {flights.map((params, i) => (
        <Butterfly
          key={i}
          params={params}
          material={assets.materials[params.kind]}
          wingGeometry={assets.wingGeometry}
          bodyGeometry={assets.bodyGeometry}
          bodyMaterial={assets.bodyMaterial}
          still={still}
          onHotspot={onHotspot}
        />
      ))}
    </>
  )
}
