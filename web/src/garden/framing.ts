/** Vertical field of view (degrees) used on landscape and square screens. */
export const BASE_FOV = 50
/** Widest vertical field of view on tall phones; beyond this the garden looks fish-eyed. */
export const MAX_FOV = 80

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/**
 * Vertical FOV for a screen aspect (width / height). Portrait screens get a wider
 * vertical FOV so the sideways view stays as wide as on a square screen, which keeps
 * the camera prop and signpost on screen on phones.
 */
export function fovForAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0 || aspect >= 1) return BASE_FOV
  const fov = toDeg(2 * Math.atan(Math.tan(toRad(BASE_FOV / 2)) / aspect))
  return Math.min(fov, MAX_FOV)
}
