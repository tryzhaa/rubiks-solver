interface CanvasLike {
  getContext: (type: string) => unknown
}

/** True when the browser can create a WebGL context. The canvas factory is injectable for tests. */
export function isWebGLAvailable(createCanvas: () => CanvasLike = () => document.createElement('canvas')): boolean {
  try {
    const canvas = createCanvas()
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}
