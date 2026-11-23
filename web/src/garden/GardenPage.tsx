'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invertMoves } from '@/cube/moves'
import { scramble } from '@/cube/state'
import { usePlayer } from '@/cube/usePlayer'
import { Message, Overlay } from '@/ui/Overlay'
import { SceneErrorBoundary } from '@/ui/SceneErrorBoundary'
import { HOTSPOT_MESSAGES, type HotspotKey } from './hotspots'
import { mulberry32 } from './layout/random'
import { type Tier, detectTier } from './quality'
import { isWebGLAvailable } from './webgl'

const GardenScene = dynamic(() => import('./GardenScene'), { ssr: false })

const TOAST_MS = 2600
const SEED = 1

interface ClientEnv {
  webgl: boolean
  tier: Tier
  reducedMotion: boolean
}

function readClientEnv(): ClientEnv {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return {
    webgl: isWebGLAvailable(),
    tier: detectTier({
      isMobile: /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent),
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
    }),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
}

/** Entry point: waits for the browser, then shows the garden or a plain explanation if 3D cannot run. */
export default function GardenPage() {
  const [env, setEnv] = useState<ClientEnv | null>(null)
  useEffect(() => {
    // Browser capabilities are only known after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(readClientEnv())
  }, [])

  if (!env) return <Message>Loading the garden…</Message>
  if (!env.webgl) {
    return <Message>This page needs WebGL2 to draw the 3D garden. Your browser or device doesn&apos;t support it or has it turned off.</Message>
  }
  return <Garden env={env} />
}

function Garden({ env }: { env: ClientEnv }) {
  const [contextLost, setContextLost] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Demo: the cube starts scrambled and plays the scramble backwards, ending solved.
  const { startMoves, moves } = useMemo(() => {
    const scrambleMoves = scramble(20, mulberry32(SEED))
    return { startMoves: scrambleMoves, moves: invertMoves(scrambleMoves) }
  }, [])

  const [player, handle] = usePlayer(env.reducedMotion)

  const onHotspot = useCallback((key: HotspotKey) => {
    setToast(HOTSPOT_MESSAGES[key])
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  if (contextLost) {
    return (
      <Message action={{ label: 'Reload', onClick: () => window.location.reload() }}>
        The 3D view stopped because the graphics context was lost.
      </Message>
    )
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0 }}>
        <SceneErrorBoundary>
          <GardenScene
            tier={env.tier}
            seed={SEED}
            reducedMotion={env.reducedMotion}
            moves={moves}
            startMoves={startMoves}
            player={handle}
            onHotspot={onHotspot}
            onContextLost={() => setContextLost(true)}
          />
        </SceneErrorBoundary>
      </div>
      <Overlay
        stepTitle="Yellow cross: L-shape"
        stepAlgorithm="F R U R' U' F'"
        moveIndex={player.index}
        moveCount={moves.length}
        playing={player.playing}
        onPlayPause={() =>
          handle.dispatch(player.playing ? { type: 'pause' } : { type: 'play', moveCount: moves.length })
        }
        onPrev={() => handle.dispatch({ type: 'prev' })}
        onNext={() => handle.dispatch({ type: 'next', moveCount: moves.length })}
        toast={toast}
      />
    </>
  )
}
