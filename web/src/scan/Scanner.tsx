'use client'

import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Face } from '@/cube/moves'
import { type Solution, solve } from '@/solver/solve'
import { STEADY_FRAMES, autoCaptureReady, averageFrames, nearestFace } from './autoCapture'
import { CAMERA_MESSAGES, type CameraFailure, canRetry } from './camera'
import type { RGB } from './colour'
import { CubeNet } from './CubeNet'
import { LETTERS, SCAN_ORDER, STICKER_HEX } from './faces'
import { type Rect, locateFace, rectsSteady } from './locate'
import { gridRect, sampleGrid } from './sample'
import { type ScanAction, type ScanState, initialScan, scanReducer } from './scanFlow'
import styles from './scanner.module.css'
import { useCamera } from './useCamera'
import { COLOUR_WORDS, validateState } from './validate'

const SAMPLE_MS = 100
/** The camera frame is scaled so its short side is this many pixels before sampling. */
const SAMPLE_SIZE = 240
const CENTRES = [4, 13, 22, 31, 40, 49]
const PALETTE_ORDER: Face[] = ['U', 'D', 'R', 'L', 'F', 'B']
/** How long the "Got it" confirmation stays after a face is stored automatically. */
const CONFIRM_MS = 1500
const UNSOLVABLE = "This cube can't be solved as entered. Check the colours against your cube."

interface ScannerProps {
  onClose: () => void
  onSolved: (result: { state: string; solution: Solution }) => void
}

/** Guided six-face scan, then a flat editor to check and fix the colours before solving. */
export function Scanner({ onClose, onSolved }: ScannerProps) {
  const [scan, dispatch] = useReducer(scanReducer, initialScan)

  // Give focus back to whatever had it before the scanner opened.
  useEffect(() => {
    const before = document.activeElement
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Scan your cube">
      <div className={styles.card}>
        <button type="button" className={styles.close} aria-label="Close scanner" onClick={onClose}>
          ✕
        </button>
        {scan.stage === 'camera' ? (
          <CameraStage scan={scan} dispatch={dispatch} />
        ) : (
          <ReviewStage scan={scan} dispatch={dispatch} onSolved={onSolved} />
        )}
      </div>
    </div>
  )
}

function FaceChips({ scan, dispatch }: { scan: ScanState; dispatch: (a: ScanAction) => void }) {
  return (
    <div className={styles.chips}>
      {SCAN_ORDER.map((f, k) => (
        <button
          key={f.face}
          type="button"
          className={`${styles.chip} ${scan.stage === 'camera' && scan.face === k ? styles.chipCurrent : ''}`}
          aria-label={`${scan.samples[k] ? 'Rescan' : 'Scan'} the ${f.colour} face`}
          onClick={() => dispatch({ type: 'retake', face: k })}
        >
          {scan.samples[k] ? '✓ ' : ''}
          {f.colour}
        </button>
      ))}
    </div>
  )
}

/** A stage heading that takes focus when the stage appears, so keyboard and screen-reader users start there. */
function StageHeading({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <h2 ref={ref} tabIndex={-1} className={styles.heading}>
      {children}
    </h2>
  )
}

/** Mounted only on the camera stage, so leaving it always turns the camera off. */
function CameraStage({ scan, dispatch }: { scan: ScanState; dispatch: (a: ScanAction) => void }) {
  const { status, videoRef, retry } = useCamera()
  // What the latest frame showed: the face's place (null = not found, the centred guide is read) and its colours.
  const [view, setView] = useState<{ samples: RGB[]; rect: Rect | null; width: number; height: number } | null>(null)
  const samples = view?.samples ?? null
  const [stored, setStored] = useState<string | null>(null)
  const current = SCAN_ORDER[scan.face]
  const expected = current.face

  // Clear the "Got it" confirmation a moment after it appears.
  useEffect(() => {
    if (!stored) return
    const timer = setTimeout(() => setStored(null), CONFIRM_MS)
    return () => clearTimeout(timer)
  }, [stored])

  useEffect(() => {
    if (status !== 'live') return
    // Recent frames for this face; a face held still with the right centre is stored automatically.
    let frames: RGB[][] = []
    let rects: (Rect | null)[] = []
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    const timer = setInterval(() => {
      const video = videoRef.current
      if (!context || !video || video.readyState < 2 || !video.videoWidth) return
      const scale = SAMPLE_SIZE / Math.min(video.videoWidth, video.videoHeight)
      const width = Math.round(video.videoWidth * scale)
      const height = Math.round(video.videoHeight * scale)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      context.drawImage(video, 0, 0, width, height)
      const pixels = context.getImageData(0, 0, width, height).data
      // Find the face anywhere in the picture; without one, read the centred guide.
      const rect = locateFace(pixels, width, height)
      const latest = sampleGrid(pixels, width, height, rect ?? gridRect(width, height))
      setView({ samples: latest, rect, width, height })
      frames = [...frames, latest].slice(-STEADY_FRAMES)
      rects = [...rects, rect].slice(-STEADY_FRAMES)
      const samePlace = rects.every((r) => r === null) || rectsSteady(rects)
      if (samePlace && autoCaptureReady(frames, expected)) {
        dispatch({ type: 'capture', samples: averageFrames(frames) })
        setStored(SCAN_ORDER.find((f) => f.face === expected)!.colour)
        frames = []
        rects = []
      }
    }, SAMPLE_MS)
    return () => clearInterval(timer)
  }, [status, videoRef, expected, dispatch])

  const failed = status !== 'idle' && status !== 'starting' && status !== 'live'
  const frameWidth = view?.width ?? 4
  const frameHeight = view?.height ?? 3
  const box = view?.rect ?? gridRect(frameWidth, frameHeight)
  const boxStyle = {
    left: `${(box.x / frameWidth) * 100}%`,
    top: `${(box.y / frameHeight) * 100}%`,
    width: `${(box.size / frameWidth) * 100}%`,
    height: `${(box.size / frameHeight) * 100}%`,
  }
  return (
    <>
      <StageHeading>
        Scan face {scan.face + 1} of 6: {current.colour}
      </StageHeading>
      <p className={styles.instruction}>{current.instruction}</p>
      <div
        className={styles.preview}
        // Keep the camera's own proportions, at most about half the screen tall.
        style={{
          aspectRatio: `${frameWidth} / ${frameHeight}`,
          width: `min(100%, 480px, ${((52 * frameWidth) / frameHeight).toFixed(1)}vh)`,
        }}
      >
        <video ref={videoRef} playsInline muted />
        <div className={`${styles.grid} ${view?.rect ? styles.found : ''}`} style={boxStyle} aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className={styles.cell} style={i === 4 ? { borderColor: STICKER_HEX[current.face] } : undefined}>
              {samples && (
                <span className={styles.swatch} style={{ background: `rgb(${samples[i].join(',')})` }}>
                  {LETTERS[nearestFace(samples[i])]}
                </span>
              )}
            </div>
          ))}
        </div>
        {status === 'starting' && <div className={styles.notice}>Starting the camera…</div>}
        {failed && (
          <div className={styles.notice} role="alert">
            <div>
              <p>{CAMERA_MESSAGES[status as CameraFailure]}</p>
              {canRetry(status) && (
                <button type="button" className={styles.primary} onClick={retry}>
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className={styles.autoStatus} role="status">
        {stored
          ? `Got it: ${stored} ✓`
          : status === 'live'
            ? view?.rect
              ? 'Face found. Hold it still for a moment.'
              : 'Hold the face up anywhere in view. It is stored by itself.'
            : ''}
      </p>
      <FaceChips scan={scan} dispatch={dispatch} />
      <div className={styles.actions}>
        <button
          type="button"
          disabled={status !== 'live' || !samples}
          onClick={() => samples && dispatch({ type: 'capture', samples })}
        >
          Capture now
        </button>
        <button type="button" onClick={() => dispatch({ type: 'manual' })}>
          Enter colours by hand
        </button>
      </div>
    </>
  )
}

function ReviewStage({
  scan,
  dispatch,
  onSolved,
}: {
  scan: ScanState
  dispatch: (a: ScanAction) => void
  onSolved: ScannerProps['onSolved']
}) {
  const state = scan.state!
  const [selected, setSelected] = useState<number | null>(null)
  const [solveError, setSolveError] = useState<string | null>(null)
  const validation = useMemo(() => validateState(state), [state])

  const marked = useMemo(() => {
    if (validation.ok) return []
    if (validation.stickers.length > 0) return validation.stickers
    if (!scan.confidence) return []
    // Twist, flip and parity can't point at a sticker: mark the ones the camera was least sure about.
    const confidence = scan.confidence
    return confidence
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => !CENTRES.includes(i))
      .sort((a, b) => a.c - b.c)
      .slice(0, 4)
      .map(({ i }) => i)
  }, [validation, scan.confidence])

  const pick = (letter: Face) => {
    if (selected === null) return
    dispatch({ type: 'setSticker', index: selected, letter })
    setSolveError(null)
  }

  const solveIt = () => {
    try {
      onSolved({ state, solution: solve(state) })
    } catch {
      setSolveError(UNSOLVABLE)
    }
  }

  const message = solveError ?? (validation.ok ? 'Looks like a real cube. Ready to solve.' : validation.message)
  return (
    <>
      <StageHeading>Check the colours</StageHeading>
      <p className={styles.instruction}>Tap a sticker to change its colour. W white, Y yellow, R red, O orange, G green, B blue.</p>
      <CubeNet state={state} marked={marked} selected={selected} onPick={setSelected} />
      {selected !== null && (
        <div className={styles.palette}>
          {PALETTE_ORDER.map((letter) => (
            <button
              key={letter}
              type="button"
              style={{ background: STICKER_HEX[letter] }}
              aria-label={`Make it ${COLOUR_WORDS[letter]}`}
              onClick={() => pick(letter)}
            >
              {LETTERS[letter]}
            </button>
          ))}
        </div>
      )}
      <p className={`${styles.status} ${validation.ok && !solveError ? '' : styles.statusBad}`} role="status">
        {message}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={!validation.ok} onClick={solveIt}>
          Solve this cube
        </button>
        <button type="button" onClick={() => dispatch({ type: 'retake', face: 0 })}>
          Rescan a face
        </button>
        <button type="button" onClick={() => dispatch({ type: 'restart' })}>
          Start over
        </button>
      </div>
    </>
  )
}
