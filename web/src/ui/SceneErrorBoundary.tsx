'use client'

import { Component, type ReactNode } from 'react'
import { Message } from './Overlay'

export const SCENE_ERROR_TEXT =
  "The 3D garden couldn't start on this device. Your browser or graphics card may not support it."

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/** Catches crashes in the 3D scene and shows a plain message instead of the framework error screen. */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <Message action={{ label: 'Reload', onClick: () => window.location.reload() }}>{SCENE_ERROR_TEXT}</Message>
    )
  }
}
