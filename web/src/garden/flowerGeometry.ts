import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { FlowerKind } from './layout/flowers'

function petalRing(n: number, sx: number, sy: number, sz: number, offset: number, tilt: number, size: number) {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < n; i++) {
    const g = new THREE.SphereGeometry(0.5, 6, 4)
    g.scale(sx, sy, sz)
    g.translate(0, 0, offset)
    g.rotateX(tilt)
    g.rotateY((i / n) * Math.PI * 2)
    parts.push(g)
  }
  const merged = mergeGeometries(parts)
  merged.scale(size, size, size)
  return merged
}

function centre(radius: number, flatten: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(radius, 8, 6)
  g.scale(1, flatten, 1)
  g.translate(0, 0.02, 0)
  return g
}

function spikeHead(): THREE.BufferGeometry {
  const buds: THREE.BufferGeometry[] = []
  for (let i = 0; i < 16; i++) {
    const g = new THREE.SphereGeometry(0.055, 5, 4)
    const width = (0.06 - i * 0.002) * 18
    g.scale(width, 1, width)
    g.translate(Math.cos(i * 2.4) * 0.03, -0.5 + i * 0.045, Math.sin(i * 2.4) * 0.03)
    buds.push(g)
  }
  return mergeGeometries(buds)
}

function puffHead(): THREE.BufferGeometry {
  const centres = [
    [0, 0, 0],
    [0.11, 0.04, 0.03],
    [-0.1, 0.05, 0.04],
    [0.02, 0.06, -0.11],
    [0.04, 0.1, 0.09],
    [-0.07, 0.1, -0.06],
    [0, 0.15, 0],
  ]
  return mergeGeometries(
    centres.map(([x, y, z]) => {
      const g = new THREE.SphereGeometry(0.1, 6, 4)
      g.translate(x, y, z)
      return g
    }),
  )
}

/** Head (and optional separate centre) geometry for a flower kind, origin at the top of the stem. */
export function buildFlowerGeometry(kind: FlowerKind): {
  head: THREE.BufferGeometry
  mid: THREE.BufferGeometry | null
} {
  switch (kind) {
    case 'daisy':
      return { head: petalRing(8, 0.26, 0.05, 0.55, 0.3, -0.25, 0.36), mid: centre(0.075, 0.7) }
    case 'sunflower':
      return { head: petalRing(13, 0.17, 0.04, 0.5, 0.34, -0.18, 0.62), mid: centre(0.16, 0.55) }
    case 'spike':
      return { head: spikeHead(), mid: null }
    case 'puff':
      return { head: puffHead(), mid: null }
  }
}
