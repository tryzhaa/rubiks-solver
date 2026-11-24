export type HotspotKey = 'camera' | 'sign' | 'butterfly' | 'cube'

/** Placeholder copy shown when a garden object is clicked, until the real features exist. The camera opens the scanner. */
export const HOTSPOT_MESSAGES: Record<Exclude<HotspotKey, 'camera'>, string> = {
  sign: 'Signpost: technique guide and My solves (two tabs)',
  butterfly: 'Butterfly: hint. It lands on the next piece to move',
  cube: 'Cube: in the real app this plays the solve',
}
