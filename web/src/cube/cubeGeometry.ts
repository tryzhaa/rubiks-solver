import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** A cube with rounded edges and corners: a subdivided box whose vertices are pushed onto a rounded shell. */
export function roundedBoxGeometry(size: number, radius: number, segments: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.BoxGeometry(size, size, size, segments, segments, segments)
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  g = mergeVertices(g)
  const pos = g.getAttribute('position')
  const inner = size / 2 - radius
  const v = new THREE.Vector3()
  const clamped = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    clamped.set(
      Math.max(-inner, Math.min(inner, v.x)),
      Math.max(-inner, Math.min(inner, v.y)),
      Math.max(-inner, Math.min(inner, v.z)),
    )
    v.sub(clamped)
    if (v.lengthSq() > 0) v.normalize().multiplyScalar(radius)
    pos.setXYZ(i, clamped.x + v.x, clamped.y + v.y, clamped.z + v.z)
  }
  g.computeVertexNormals()
  return g
}

/** A slightly raised rounded-square sticker facing +z, just outside a 0.97 cubie. */
export function stickerGeometry(): THREE.ExtrudeGeometry {
  const half = 0.39
  const r = 0.09
  const shape = new THREE.Shape()
  shape.moveTo(-half + r, -half)
  shape.lineTo(half - r, -half)
  shape.quadraticCurveTo(half, -half, half, -half + r)
  shape.lineTo(half, half - r)
  shape.quadraticCurveTo(half, half, half - r, half)
  shape.lineTo(-half + r, half)
  shape.quadraticCurveTo(-half, half, -half, half - r)
  shape.lineTo(-half, -half + r)
  shape.quadraticCurveTo(-half, -half, -half + r, -half)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 8,
  })
  g.translate(0, 0, 0.455)
  return g
}
