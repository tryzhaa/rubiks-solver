interface CanvasLike {
  getContext: (type: string) => unknown
}

interface ProbeContext {
  getExtension?: (name: string) => { loseContext?: () => void } | null
}

/**
 * True when the browser can create a WebGL2 context (three.js dropped WebGL1).
 * The probe context is released right away. The canvas factory is injectable for tests.
 */
export function isWebGLAvailable(createCanvas: () => CanvasLike = () => document.createElement('canvas')): boolean {
  try {
    const context = createCanvas().getContext('webgl2') as ProbeContext | null
    if (!context) return false
    context.getExtension?.('WEBGL_lose_context')?.loseContext?.()
    return true
  } catch {
    return false
  }
}
