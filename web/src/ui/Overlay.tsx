'use client'

import styles from './overlay.module.css'

export interface OverlayProps {
  /** The current step: algorithm and setup are notation strings, empty when there is none. */
  step: { title: string; algorithm: string; setup: string; why: string }
  moveIndex: number
  moveCount: number
  playing: boolean
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
  onNewScramble: () => void
  /** Message from clicking a garden object, or null. */
  toast: string | null
}

export function Overlay({
  step,
  moveIndex,
  moveCount,
  playing,
  onPlayPause,
  onPrev,
  onNext,
  onNewScramble,
  toast,
}: OverlayProps) {
  return (
    <>
      <div className={styles.top}>
        <div className={`${styles.pill} ${styles.banner}`}>
          <div className={styles.headline}>
            <span>{step.title}</span>
            {step.algorithm && <span className={styles.chip}>{step.algorithm}</span>}
            <span className={styles.counter}>
              {moveIndex} / {moveCount}
            </span>
          </div>
          {step.setup && <p className={styles.setup}>First: {step.setup}</p>}
          <p className={styles.why}>{step.why}</p>
        </div>

        <div className={`${styles.pill} ${styles.bar}`}>
          <button type="button" aria-label="Previous move" onClick={onPrev} disabled={moveIndex === 0}>
            ⏮
          </button>
          <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={onPlayPause}>
            {playing ? '⏸' : '▶'}
          </button>
          <button type="button" aria-label="Next move" onClick={onNext} disabled={moveIndex >= moveCount}>
            ⏭
          </button>
          <button type="button" aria-label="Sound (not yet available)">
            🔊
          </button>
          <button type="button">Simple view</button>
          <button type="button" onClick={onNewScramble}>
            New scramble
          </button>
        </div>
      </div>

      <div className={`${styles.pill} ${styles.hint}`}>
        <span className={styles.chip}>Drag</span> look around <span className={styles.chip}>Click</span> the camera,
        signpost or a butterfly
      </div>

      {toast && (
        <div className={`${styles.pill} ${styles.toast}`} role="status">
          {toast}
        </div>
      )}
    </>
  )
}

export function Message({ children, action }: { children: React.ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div className={styles.message} role="alert">
      <div>
        <p>{children}</p>
        {action && (
          <button type="button" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
