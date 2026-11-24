'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'
import { type CameraStatus, cameraErrorStatus, cameraSupport, stopStream } from './camera'

const CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: false,
}

function support(): 'ok' | 'insecure' | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported'
  return cameraSupport({
    isSecureContext: window.isSecureContext,
    hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia === 'function',
  })
}

/**
 * Opens the camera while the calling component is mounted and turns it off on unmount or retry.
 * Mount the caller only while the camera is needed.
 */
export function useCamera(): { status: CameraStatus; videoRef: RefObject<HTMLVideoElement | null>; retry(): void } {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; status: CameraStatus }>({ attempt: -1, status: 'idle' })
  const supported = support()

  useEffect(() => {
    if (supported !== 'ok') return
    let cancelled = false
    let stream: MediaStream | null = null
    const video = videoRef.current
    navigator.mediaDevices.getUserMedia(CONSTRAINTS).then(
      (s) => {
        if (cancelled) {
          stopStream(s)
          return
        }
        stream = s
        if (video) {
          video.srcObject = s
          video.play().catch(() => {})
        }
        setResult({ attempt, status: 'live' })
      },
      (error) => {
        if (!cancelled) setResult({ attempt, status: cameraErrorStatus(error) })
      },
    )
    return () => {
      cancelled = true
      stopStream(stream)
      if (video) video.srcObject = null
    }
  }, [supported, attempt])

  const status: CameraStatus = supported !== 'ok' ? supported : result.attempt === attempt ? result.status : 'starting'
  return { status, videoRef, retry: () => setAttempt((a) => a + 1) }
}
