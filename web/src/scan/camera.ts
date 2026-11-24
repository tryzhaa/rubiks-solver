export type CameraFailure = 'insecure' | 'unsupported' | 'denied' | 'unavailable' | 'busy' | 'failed'
export type CameraStatus = 'idle' | 'starting' | 'live' | CameraFailure

export function cameraSupport(env: { isSecureContext: boolean; hasGetUserMedia: boolean }): 'ok' | 'insecure' | 'unsupported' {
  if (!env.isSecureContext) return 'insecure'
  return env.hasGetUserMedia ? 'ok' : 'unsupported'
}

/** Maps a getUserMedia rejection to what the person can do about it. */
export function cameraErrorStatus(error: unknown): 'denied' | 'unavailable' | 'busy' | 'failed' {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'unavailable'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'failed'
}

export const CAMERA_MESSAGES: Record<CameraFailure, string> = {
  insecure: 'The camera only works on a secure (https) page. Open this page over https, or enter the colours by hand.',
  unsupported: "This browser can't use a camera. You can enter the colours by hand.",
  denied:
    "Camera access was blocked. Allow the camera in your browser's site settings and try again, or enter the colours by hand.",
  unavailable: 'No camera was found. You can enter the colours by hand.',
  busy: 'The camera is being used by another app. Close it and try again, or enter the colours by hand.',
  failed: "The camera couldn't start. Try again, or enter the colours by hand.",
}

/** Whether trying again could help (not when the page or browser can never use a camera). */
export function canRetry(status: CameraStatus): boolean {
  return status !== 'insecure' && status !== 'unsupported'
}

/** Turns the camera off: stops every track of the stream. */
export function stopStream(stream: { getTracks(): { stop(): void }[] } | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}
