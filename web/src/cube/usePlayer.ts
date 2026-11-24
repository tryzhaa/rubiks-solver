import { type MutableRefObject, useCallback, useMemo, useRef, useState } from 'react'

export const SECONDS_PER_MOVE = 0.55
/** Largest time step a single tick may advance, so a hidden tab cannot skip through many moves. */
export const MAX_DT = 0.05

export interface PlayerState {
  /** Number of moves fully completed. */
  index: number
  /** 0..1 progress through move number `index`. */
  progress: number
  playing: boolean
  speed: number
}

export type PlayerAction =
  | { type: 'play'; moveCount: number }
  | { type: 'pause' }
  | { type: 'next'; moveCount: number }
  | { type: 'prev' }
  | { type: 'setSpeed'; speed: number }
  | { type: 'tick'; dt: number; moveCount: number }
  | { type: 'reset' }

export function createPlayerState(startPaused: boolean): PlayerState {
  return { index: 0, progress: 0, playing: !startPaused, speed: 1 }
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'play':
      if (action.moveCount === 0) return { ...state, playing: false }
      if (state.index >= action.moveCount) return { ...state, index: 0, progress: 0, playing: true }
      return { ...state, playing: true }
    case 'pause':
      return { ...state, playing: false }
    case 'next':
      return { ...state, index: Math.min(action.moveCount, state.index + 1), progress: 0, playing: false }
    case 'prev':
      return { ...state, index: Math.max(0, state.index - 1), progress: 0, playing: false }
    case 'reset':
      return { ...state, index: 0, progress: 0 }
    case 'setSpeed':
      return action.speed > 0 ? { ...state, speed: action.speed } : state
    case 'tick': {
      if (!state.playing) return state
      if (state.index >= action.moveCount) return { ...state, playing: false }
      const progress = state.progress + (Math.min(action.dt, MAX_DT) * state.speed) / SECONDS_PER_MOVE
      if (progress < 1) return { ...state, progress }
      const index = state.index + 1
      return { ...state, index, progress: 0, playing: index < action.moveCount }
    }
  }
}

export interface PlayerHandle {
  /** Always-current state, safe to read inside animation frames without re-rendering. */
  ref: MutableRefObject<PlayerState>
  dispatch: (action: PlayerAction) => void
}

/**
 * Player state for the cube. `state` re-renders React when the step or play/pause changes; per-frame
 * progress lives only in `handle.ref`, so the page is not re-rendered 60 times a second.
 */
export function usePlayer(startPaused: boolean): [PlayerState, PlayerHandle] {
  const [state, setState] = useState(() => createPlayerState(startPaused))
  const ref = useRef(state)

  const dispatch = useCallback((action: PlayerAction) => {
    const before = ref.current
    const after = playerReducer(before, action)
    ref.current = after
    const visible = action.type !== 'tick' || before.index !== after.index || before.playing !== after.playing
    if (visible) setState(after)
  }, [])

  const handle = useMemo(() => ({ ref, dispatch }), [dispatch])
  return [state, handle]
}
