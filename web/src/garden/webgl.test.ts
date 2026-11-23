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

  test('asks only for webgl2, because three.js no longer supports WebGL1', () => {
    const asked: string[] = []
    isWebGLAvailable(() => ({
      getContext: (type: string) => {
        asked.push(type)
        return null
      },
    }))
    expect(asked).toEqual(['webgl2'])
  })

  test('false on a WebGL1-only browser', () => {
    expect(isWebGLAvailable(() => ({ getContext: (type: string) => (type === 'webgl' ? {} : null) }))).toBe(false)
  })

  test('releases the probe context so it does not count against the browser limit', () => {
    let released = false
    const context = { getExtension: (name: string) => (name === 'WEBGL_lose_context' ? { loseContext: () => (released = true) } : null) }
    expect(isWebGLAvailable(() => ({ getContext: () => context }))).toBe(true)
    expect(released).toBe(true)
  })
})
