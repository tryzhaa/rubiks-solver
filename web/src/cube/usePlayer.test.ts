import { describe, expect, test } from 'vitest'
import { type PlayerState, createPlayerState, playerReducer } from './usePlayer'

const playing = (over: Partial<PlayerState> = {}): PlayerState => ({ ...createPlayerState(false), ...over })

describe('createPlayerState', () => {
  test('starts at move 0, speed 1, playing unless startPaused', () => {
    expect(createPlayerState(false)).toEqual({ index: 0, progress: 0, playing: true, speed: 1 })
    expect(createPlayerState(true).playing).toBe(false)
  })
})

describe('tick', () => {
  test('a huge dt (tab was hidden) advances less than one move', () => {
    const s = playerReducer(playing(), { type: 'tick', dt: 10, moveCount: 5 })
    expect(s.index).toBe(0)
    expect(s.progress).toBeGreaterThan(0)
    expect(s.progress).toBeLessThan(1)
  })

  test('progress advances by dt * speed / 0.55', () => {
    const s = playerReducer(playing(), { type: 'tick', dt: 0.011, moveCount: 5 })
    expect(s.progress).toBeCloseTo(0.02, 5)
  })

  test('setSpeed(2) doubles progress per tick', () => {
    const slow = playerReducer(playing(), { type: 'tick', dt: 0.02, moveCount: 5 })
    const fast = playerReducer(playerReducer(playing(), { type: 'setSpeed', speed: 2 }), {
      type: 'tick',
      dt: 0.02,
      moveCount: 5,
    })
    expect(fast.progress).toBeCloseTo(slow.progress * 2, 10)
  })

  test('rolls to the next move at progress 1', () => {
    let s = playing({ progress: 0.99 })
    s = playerReducer(s, { type: 'tick', dt: 0.05, moveCount: 5 })
    expect(s.index).toBe(1)
    expect(s.progress).toBe(0)
    expect(s.playing).toBe(true)
  })

  test('reaching moveCount stops playback', () => {
    let s = playing({ index: 0, progress: 0.99 })
    s = playerReducer(s, { type: 'tick', dt: 0.05, moveCount: 1 })
    expect(s.index).toBe(1)
    expect(s.playing).toBe(false)
  })

  test('moveCount 0 leaves index 0 and stops', () => {
    const s = playerReducer(playing(), { type: 'tick', dt: 0.05, moveCount: 0 })
    expect(s.index).toBe(0)
    expect(s.playing).toBe(false)
  })

  test('does nothing while paused', () => {
    const paused = createPlayerState(true)
    expect(playerReducer(paused, { type: 'tick', dt: 0.05, moveCount: 5 })).toEqual(paused)
  })
})

describe('controls', () => {
  test('play restarts from the beginning when the sequence is finished', () => {
    const s = playerReducer(playing({ index: 3, playing: false }), { type: 'play', moveCount: 3 })
    expect(s).toMatchObject({ index: 0, progress: 0, playing: true })
  })

  test('play on an empty sequence does not start playback', () => {
    expect(playerReducer(createPlayerState(true), { type: 'play', moveCount: 0 }).playing).toBe(false)
  })

  test('pause stops playback and keeps position', () => {
    const s = playerReducer(playing({ index: 2, progress: 0.4 }), { type: 'pause' })
    expect(s).toMatchObject({ index: 2, progress: 0.4, playing: false })
  })

  test('next steps forward, pauses, resets progress and stays at the end', () => {
    const s = playerReducer(playing({ index: 1, progress: 0.5 }), { type: 'next', moveCount: 3 })
    expect(s).toMatchObject({ index: 2, progress: 0, playing: false })
    expect(playerReducer(playing({ index: 3 }), { type: 'next', moveCount: 3 }).index).toBe(3)
  })

  test('prev steps back, pauses, resets progress and stays at 0', () => {
    const s = playerReducer(playing({ index: 2, progress: 0.5 }), { type: 'prev' })
    expect(s).toMatchObject({ index: 1, progress: 0, playing: false })
    expect(playerReducer(playing({ index: 0 }), { type: 'prev' }).index).toBe(0)
  })

  test('setSpeed ignores zero and negative speeds', () => {
    expect(playerReducer(playing(), { type: 'setSpeed', speed: 0 }).speed).toBe(1)
    expect(playerReducer(playing(), { type: 'setSpeed', speed: -2 }).speed).toBe(1)
    expect(playerReducer(playing(), { type: 'setSpeed', speed: 0.5 }).speed).toBe(0.5)
  })
})
