import { describe, expect, test } from 'vitest'
import { CAMERA_MESSAGES, cameraErrorStatus, cameraSupport, canRetry, stopStream } from './camera'

describe('camera helpers', () => {
  test('support needs a secure page and getUserMedia', () => {
    expect(cameraSupport({ isSecureContext: false, hasGetUserMedia: true })).toBe('insecure')
    expect(cameraSupport({ isSecureContext: true, hasGetUserMedia: false })).toBe('unsupported')
    expect(cameraSupport({ isSecureContext: true, hasGetUserMedia: true })).toBe('ok')
  })

  test.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'unavailable'],
    ['OverconstrainedError', 'unavailable'],
    ['NotReadableError', 'busy'],
    ['AbortError', 'busy'],
    ['TypeError', 'failed'],
  ])('%s maps to %s', (name, status) => {
    expect(cameraErrorStatus(Object.assign(new Error('x'), { name }))).toBe(status)
  })

  test('a non-error rejection maps to failed', () => {
    expect(cameraErrorStatus('nope')).toBe('failed')
  })

  test('every failure message offers entering colours by hand', () => {
    Object.values(CAMERA_MESSAGES).forEach((m) => expect(m).toMatch(/enter the colours by hand/))
    expect(canRetry('denied')).toBe(true)
    expect(canRetry('insecure')).toBe(false)
    expect(canRetry('unsupported')).toBe(false)
  })

  test('stopStream stops every track and accepts null', () => {
    const stopped: number[] = []
    stopStream({ getTracks: () => [0, 1].map((i) => ({ stop: () => stopped.push(i) })) })
    expect(stopped).toEqual([0, 1])
    expect(() => stopStream(null)).not.toThrow()
  })
})
