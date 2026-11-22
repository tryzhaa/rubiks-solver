import * as THREE from 'three'
import { describe, expect, test, vi } from 'vitest'
import { buildMeadow } from './buildMeadow'
import { countsFor } from './quality'

const instanced = (group: THREE.Group) =>
  group.children.filter((c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh)

describe('buildMeadow', () => {
  test('creates one grass mesh with the tier grass count', () => {
    const { group } = buildMeadow('low', 1)
    const counts = instanced(group).map((m) => m.count)
    expect(counts).toContain(countsFor('low').grass)
  })

  test('creates a head for every flower and a stem for every flower', () => {
    const { group } = buildMeadow('low', 1)
    const flowers = Object.values(countsFor('low').flowers).reduce((a, b) => a + b, 0)
    const total = instanced(group).reduce((a, m) => a + m.count, 0)
    const grass = countsFor('low').grass
    const centres = countsFor('low').flowers.daisy + countsFor('low').flowers.sunflower
    // stems + heads + centres + grass
    expect(total).toBe(grass + flowers * 2 + centres)
  })

  test('every head has per-instance colours', () => {
    const { group } = buildMeadow('low', 1)
    const withColour = instanced(group).filter((m) => m.instanceColor !== null)
    // grass + 4 head meshes
    expect(withColour.length).toBe(5)
  })

  test('dispose releases every geometry and material it created', () => {
    const built = buildMeadow('low', 1)
    const geoSpy = vi.fn()
    const matSpy = vi.fn()
    instanced(built.group).forEach((m) => {
      m.geometry.addEventListener('dispose', geoSpy)
      ;(m.material as THREE.Material).addEventListener('dispose', matSpy)
    })
    built.dispose()
    expect(geoSpy).toHaveBeenCalled()
    expect(matSpy).toHaveBeenCalled()
  })

  test('is deterministic for the same seed', () => {
    const a = instanced(buildMeadow('low', 5).group)[0].instanceMatrix.array
    const b = instanced(buildMeadow('low', 5).group)[0].instanceMatrix.array
    expect(Array.from(a)).toEqual(Array.from(b))
  })
})

describe('setWind', () => {
  test('drives the shared wind time and strength', () => {
    const meadow = buildMeadow('low', 1)
    meadow.setWind(3.25, 0.5)
    expect(meadow.uniforms.uTime.value).toBe(3.25)
    expect(meadow.uniforms.uStrength.value).toBe(0.5)
  })

  test('strength 0 (reduced motion) is kept as 0', () => {
    const meadow = buildMeadow('low', 1)
    meadow.setWind(10, 0)
    expect(meadow.uniforms.uStrength.value).toBe(0)
  })
})
