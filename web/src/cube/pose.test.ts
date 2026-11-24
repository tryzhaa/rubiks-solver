import { Matrix4 } from 'three'
import { describe, expect, test } from 'vitest'
import { layerTurn } from './layers'
import { parseMoves } from './moves'
import { applyTurn, createCubies, cubiePosition, easeInOutQuad, poseAfter } from './pose'

const find = (cubies: ReturnType<typeof createCubies>, home: [number, number, number]) =>
  cubies.find((c) => c.home.join() === home.join())!

describe('createCubies', () => {
  test('makes 27 cubies at their home positions with identity rotation', () => {
    const cubies = createCubies()
    expect(cubies).toHaveLength(27)
    cubies.forEach((c) => {
      expect(cubiePosition(c)).toEqual(c.home)
      expect(c.matrix.equals(new Matrix4().makeTranslation(...c.home))).toBe(true)
    })
  })
})

describe('applyTurn', () => {
  test('R moves the URF corner to the URB position (matches the facelet model)', () => {
    const cubies = createCubies()
    applyTurn(cubies, layerTurn({ face: 'R', turns: 1 }))
    expect(cubiePosition(find(cubies, [1, 1, 1]))).toEqual([1, 1, -1])
  })

  test('U moves the UFL corner to the UBL position', () => {
    const cubies = createCubies()
    applyTurn(cubies, layerTurn({ face: 'U', turns: 1 }))
    expect(cubiePosition(find(cubies, [-1, 1, 1]))).toEqual([-1, 1, -1])
  })

  test('only the 9 cubies in the layer move', () => {
    const cubies = createCubies()
    applyTurn(cubies, layerTurn({ face: 'F', turns: 1 }))
    expect(cubies.filter((c) => c.home.join() !== cubiePosition(c).join())).toHaveLength(8) // centre stays
  })

  test('positions stay exact integers after many turns (no float drift)', () => {
    const cubies = poseAfter(parseMoves("R U R' U' ".repeat(50)))
    cubies.forEach((c) => cubiePosition(c).forEach((v) => expect(Number.isInteger(v)).toBe(true)))
    cubies.forEach((c) => c.matrix.elements.forEach((e) => expect([-1, 0, 1]).toContain(Math.round(e) || 0)))
  })

  test('a move followed by its inverse restores every cubie exactly', () => {
    const cubies = poseAfter(parseMoves("R U F2 D' L B R'")).length
    expect(cubies).toBe(27)
    const there = poseAfter(parseMoves("R U F2 D' L B"))
    const back = poseAfter(parseMoves("R U F2 D' L B B' L' D F2 U' R'"))
    const identity = createCubies()
    back.forEach((c, i) => expect(c.matrix.equals(identity[i].matrix)).toBe(true))
    expect(there.some((c, i) => !c.matrix.equals(identity[i].matrix))).toBe(true)
  })

  test('four quarter turns of every face restore the cube', () => {
    for (const face of ['U', 'D', 'L', 'R', 'F', 'B']) {
      const cubies = poseAfter(parseMoves(`${face} ${face} ${face} ${face}`))
      const identity = createCubies()
      cubies.forEach((c, i) => expect(c.matrix.equals(identity[i].matrix)).toBe(true))
    }
  })
})

describe('poseAfter', () => {
  test('empty move list is the solved pose', () => {
    const cubies = poseAfter([])
    const identity = createCubies()
    cubies.forEach((c, i) => expect(c.matrix.equals(identity[i].matrix)).toBe(true))
  })
})

describe('easeInOutQuad', () => {
  test('is 0 at 0, 1 at 1, 0.5 at 0.5 and monotonic', () => {
    expect(easeInOutQuad(0)).toBe(0)
    expect(easeInOutQuad(1)).toBe(1)
    expect(easeInOutQuad(0.5)).toBe(0.5)
    let last = -1
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeInOutQuad(t)
      expect(v).toBeGreaterThanOrEqual(last)
      last = v
    }
  })
})

describe('whole-cube turns', () => {
  test('y moves the right centre cubie to the front, like U moves its edge', () => {
    const cubies = poseAfter([{ face: 'y', turns: 1 }])
    const rightCentre = cubies.find((c) => c.home.join() === '1,0,0')!
    expect(cubiePosition(rightCentre)).toEqual([0, 0, 1])
  })
})
