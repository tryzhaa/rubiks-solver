import * as THREE from 'three'
import { buildFlowerGeometry } from './flowerGeometry'
import { FLOWER_SPECS, type FlowerKind, generateFlowers } from './layout/flowers'
import { mulberry32 } from './layout/random'
import { type Tier, countsFor } from './quality'
import { type WindUniforms, applyWind } from './wind'

const KINDS: FlowerKind[] = ['daisy', 'spike', 'sunflower', 'puff']
const CENTRE_COLOR: Partial<Record<FlowerKind, number>> = { daisy: 0xc7740a, sunflower: 0x5a3010 }
const GRASS_RADIUS = 30

export interface BuiltMeadow {
  group: THREE.Group
  /** Read-only view of the wind uniforms shared by every meadow material. */
  uniforms: Readonly<WindUniforms>
  /** Call every frame: elapsed seconds and wind strength (0 = still, 1 = full). */
  setWind: (time: number, strength: number) => void
  dispose: () => void
}

function grassBlade(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(0.07, 1, 1, 3)
  g.translate(0, 0.5, 0)
  const pos = g.getAttribute('position')
  const colors: number[] = []
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    pos.setX(i, pos.getX(i) * (1 - y * 0.9)) // taper to a point
    const shade = 0.45 + y * 0.55 // darker at the root
    colors.push(shade, shade, shade)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return g
}

function buildGrass(count: number, seed: number, uniforms: WindUniforms) {
  const geometry = grassBlade()
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.9,
  })
  applyWind(material, 0.3, uniforms)
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  const rng = mulberry32(seed ^ 0x9e3779b9)
  const between = (lo: number, hi: number) => lo + rng() * (hi - lo)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  for (let i = 0; i < count; i++) {
    const angle = between(0, Math.PI * 2)
    const dist = Math.sqrt(rng()) * GRASS_RADIUS
    dummy.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist)
    dummy.rotation.set(between(-0.15, 0.15), between(0, Math.PI * 2), between(-0.15, 0.15))
    dummy.scale.set(1, between(0.3, 0.9), 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    // Raw HSL in the working colour space matches the approved prototype look.
    color.setHSL(between(0.24, 0.33), between(0.55, 0.75), between(0.3, 0.42))
    mesh.setColorAt(i, color)
  }
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  return { mesh, geometry, material }
}

export function buildMeadow(tier: Tier, seed: number): BuiltMeadow {
  const uniforms: WindUniforms = { uTime: { value: 0 }, uStrength: { value: 1 } }
  const counts = countsFor(tier)
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []

  const grass = buildGrass(counts.grass, seed, uniforms)
  group.add(grass.mesh)
  geometries.push(grass.geometry)
  materials.push(grass.material)

  const stemGeometry = new THREE.CylinderGeometry(0.012, 0.024, 1, 5)
  stemGeometry.translate(0, 0.5, 0)
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x2f9a33, roughness: 0.8 })
  applyWind(stemMaterial, 0.1, uniforms)
  geometries.push(stemGeometry)
  materials.push(stemMaterial)

  const all = generateFlowers(counts.flowers, seed)
  const dummy = new THREE.Object3D()

  KINDS.forEach((kind) => {
    const flowers = all.filter((f) => f.kind === kind)
    if (flowers.length === 0) return
    const { head, mid } = buildFlowerGeometry(kind)
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.55 })
    applyWind(headMaterial, 0.1, uniforms)
    geometries.push(head)
    materials.push(headMaterial)

    const stems = new THREE.InstancedMesh(stemGeometry, stemMaterial, flowers.length)
    const heads = new THREE.InstancedMesh(head, headMaterial, flowers.length)
    let centres: THREE.InstancedMesh | null = null
    if (mid) {
      const midMaterial = new THREE.MeshStandardMaterial({ color: CENTRE_COLOR[kind] ?? 0xc7740a, roughness: 0.8 })
      applyWind(midMaterial, 0.1, uniforms)
      geometries.push(mid)
      materials.push(midMaterial)
      centres = new THREE.InstancedMesh(mid, midMaterial, flowers.length)
    }

    const palette = FLOWER_SPECS[kind].palette
    const color = new THREE.Color()
    flowers.forEach((f, i) => {
      dummy.position.set(f.x, 0, f.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, f.height, 1)
      dummy.updateMatrix()
      stems.setMatrixAt(i, dummy.matrix)

      dummy.position.set(f.x, f.height, f.z)
      dummy.rotation.set(f.tiltX, f.yaw, f.tiltZ)
      dummy.scale.setScalar(f.scale)
      dummy.updateMatrix()
      heads.setMatrixAt(i, dummy.matrix)
      centres?.setMatrixAt(i, dummy.matrix)
      heads.setColorAt(i, color.setHex(palette[f.colorIndex]))
    })

    for (const mesh of [stems, heads, centres]) {
      if (!mesh) continue
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      group.add(mesh)
    }
  })

  return {
    group,
    uniforms,
    setWind: (time, strength) => {
      uniforms.uTime.value = time
      uniforms.uStrength.value = strength
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      group.children.forEach((c) => c instanceof THREE.InstancedMesh && c.dispose())
    },
  }
}
