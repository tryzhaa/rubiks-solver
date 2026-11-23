import { describe, expect, test } from 'vitest'
import { HOTSPOT_MESSAGES } from './hotspots'

describe('HOTSPOT_MESSAGES', () => {
  test('has a non-empty message for each of the four hotspots', () => {
    expect(Object.keys(HOTSPOT_MESSAGES).sort()).toEqual(['butterfly', 'camera', 'cube', 'sign'])
    Object.values(HOTSPOT_MESSAGES).forEach((m) => expect(m.trim().length).toBeGreaterThan(0))
  })

  test('uses the approved prototype wording', () => {
    expect(HOTSPOT_MESSAGES.camera).toBe('Camera: scan your cube (the camera opens here)')
    expect(HOTSPOT_MESSAGES.sign).toBe('Signpost: technique guide and My solves (two tabs)')
    expect(HOTSPOT_MESSAGES.butterfly).toBe('Butterfly: hint. It lands on the next piece to move')
    expect(HOTSPOT_MESSAGES.cube).toBe('Cube: in the real app this plays the solve')
  })
})
