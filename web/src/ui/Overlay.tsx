'use client'

import styles from './overlay.module.css'

export interface OverlayProps {
  stepTitle: string
  stepAlgorithm: string
  moveIndex: number
  moveCount: number
  playing: boolean
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
  /** Message from clicking a garden object, or null. */
  toast: string | null
}

export function Overlay({
  stepTitle,
  stepAlgorithm,
  moveIndex,
  moveCount,
  playing,
  onPlayPause,
  onPrev,
  onNext,
  toast,
}: OverlayProps) {
  return (
    <>
      <div className={`${styles.pill} ${styles.banner}`}>
        <span>{stepTitle}</span>
        <span className={styles.chip}>{stepAlgorithm}</span>
        <span>
          {moveIndex} / {moveCount}
        </span>
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
