import { isValidElement } from 'react'
import { describe, expect, test } from 'vitest'
import { Message } from './Overlay'
import { SCENE_ERROR_TEXT, SceneErrorBoundary } from './SceneErrorBoundary'

describe('SceneErrorBoundary', () => {
  test('switches to the failed state when the scene throws', () => {
    expect(SceneErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true })
  })

  test('renders its children while nothing has failed', () => {
    const boundary = new SceneErrorBoundary({ children: 'scene' })
    expect(boundary.render()).toBe('scene')
  })

  test('renders a plain message with a reload action after a failure', () => {
    const boundary = new SceneErrorBoundary({ children: 'scene' })
    boundary.state = { failed: true }
    const output = boundary.render()
    expect(isValidElement(output)).toBe(true)
    const element = output as React.ReactElement<{ children: string; action: { label: string } }>
    expect(element.type).toBe(Message)
    expect(element.props.children).toBe(SCENE_ERROR_TEXT)
    expect(element.props.action.label).toBe('Reload')
  })
})
