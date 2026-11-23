export type HotspotKey = 'camera' | 'sign' | 'butterfly' | 'cube'

/** Placeholder copy shown when a garden object is clicked, until the real features exist. */
export const HOTSPOT_MESSAGES: Record<HotspotKey, string> = {
  camera: 'Camera: scan your cube (the camera opens here)',
  sign: 'Signpost: technique guide and My solves (two tabs)',
  butterfly: 'Butterfly: hint. It lands on the next piece to move',
  cube: 'Cube: in the real app this plays the solve',
}
