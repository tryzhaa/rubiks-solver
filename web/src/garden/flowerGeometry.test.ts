import { Vector3 } from 'three'
import { describe, expect, test } from 'vitest'
import { buildFlowerGeometry } from './flowerGeometry'
import type { FlowerKind } from './layout/flowers'

const KINDS: FlowerKind[] = ['daisy', 'spike', 'sunflower', 'puff']

describe('buildFlowerGeometry', () => {
  test.each(KINDS)('%s head has finite vertices', (kind) => {
    const { head } = buildFlowerGeometry(kind)
    const pos = head.getAttribute('position')
    expect(pos.count).toBeGreaterThan(0)
    expect(Array.from(pos.array).every(Number.isFinite)).toBe(true)
  })

  test('only daisy and sunflower have a separate centre', () => {
    expect(buildFlowerGeometry('daisy').mid).not.toBeNull()
    expect(buildFlowerGeometry('sunflower').mid).not.toBeNull()
    expect(buildFlowerGeometry('spike').mid).toBeNull()
    expect(buildFlowerGeometry('puff').mid).toBeNull()
  })

  test('spike head is taller than it is wide', () => {
    const head = buildFlowerGeometry('spike').head
    head.computeBoundingBox()
    const size = head.boundingBox!.getSize(new Vector3())
    expect(size.y).toBeGreaterThan(size.x * 2)
  })
})
