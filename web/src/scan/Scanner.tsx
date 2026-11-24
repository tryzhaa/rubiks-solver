'use client'

import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Face } from '@/cube/moves'
import { type Solution, solve } from '@/solver/solve'
import { CAMERA_MESSAGES, type CameraFailure, canRetry } from './camera'
import type { RGB } from './colour'
import { CubeNet } from './CubeNet'
import { LETTERS, SCAN_ORDER, STICKER_HEX } from './faces'
import { sampleGrid } from './sample'
import { type ScanAction, type ScanState, initialScan, scanReducer } from './scanFlow'
import styles from './scanner.module.css'
import { useCamera } from './useCamera'
import { COLOUR_WORDS, validateState } from './validate'

const SAMPLE_MS = 100
/** The camera frame is scaled so its short side is this many pixels before sampling. */
const SAMPLE_SIZE = 240
const CENTRES = [4, 13, 22, 31, 40, 49]
const PALETTE_ORDER: Face[] = ['U', 'D', 'R', 'L', 'F', 'B']
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
  const [samples, setSamples] = useState<RGB[] | null>(null)
  const current = SCAN_ORDER[scan.face]

  useEffect(() => {
    if (status !== 'live') return
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
      setSamples(sampleGrid(context.getImageData(0, 0, width, height).data, width, height))
    }, SAMPLE_MS)
    return () => clearInterval(timer)
  }, [status, videoRef])

  const failed = status !== 'idle' && status !== 'starting' && status !== 'live'
  return (
    <>
      <StageHeading>
        Scan face {scan.face + 1} of 6: {current.colour}
      </StageHeading>
      <p className={styles.instruction}>{current.instruction}</p>
      <div className={styles.preview}>
        <video ref={videoRef} playsInline muted />
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className={styles.cell} style={i === 4 ? { borderColor: STICKER_HEX[current.face] } : undefined}>
              {samples && <span className={styles.swatch} style={{ background: `rgb(${samples[i].join(',')})` }} />}
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
      <FaceChips scan={scan} dispatch={dispatch} />
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={status !== 'live' || !samples}
          onClick={() => samples && dispatch({ type: 'capture', samples })}
        >
          Capture
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
