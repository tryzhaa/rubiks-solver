import { describe, expect, test } from 'vitest'
import { isWebGLAvailable } from './webgl'

describe('isWebGLAvailable', () => {
  test('true when the canvas can create a webgl context', () => {
    expect(isWebGLAvailable(() => ({ getContext: () => ({}) }))).toBe(true)
  })

  test('false when no context can be created', () => {
    expect(isWebGLAvailable(() => ({ getContext: () => null }))).toBe(false)
  })

  test('false when creating the canvas or context throws', () => {
    expect(
      isWebGLAvailable(() => {
        throw new Error('no document')
      }),
    ).toBe(false)
    expect(
      isWebGLAvailable(() => ({
        getContext: () => {
          throw new Error('blocked')
        },
      })),
    ).toBe(false)
  })

  test('tries webgl2 first, then webgl', () => {
    const asked: string[] = []
    isWebGLAvailable(() => ({
      getContext: (type: string) => {
        asked.push(type)
        return null
      },
    }))
    expect(asked).toEqual(['webgl2', 'webgl'])
  })
})
