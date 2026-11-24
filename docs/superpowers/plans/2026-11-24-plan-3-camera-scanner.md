# Camera Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking the camera in the garden opens a guided six-face scanner. It reads each sticker's colour, lets the user fix mistakes in a flat editor with letter labels, checks the cube is possible and points at likely misreads, then plays the solve of that exact cube in the garden.

**Architecture:**
- **Pure logic in `web/src/scan/`:** sampling a video frame's 3×3 grid, colour maths, classification, validity checks, the scan-flow reducer and camera error mapping. All of it is unit-tested in node.
- **Thin React layer:** a `useCamera` hook, plus a `Scanner` overlay with a `CubeNet` editor, drawn as DOM over the 3D garden.
- **Showing the scanned cube in the garden:** a scanned cube has no scramble, so the garden builds one from the solution itself (`startMovesFor`). The viewer then shows the cube exactly as it was held.

**Tech Stack:** TypeScript (strict), React 19, Next.js 16 App Router, `getUserMedia`, canvas 2D, vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-22-rubiks-garden-design.md` (subsystem 3).

## Global Constraints

- **Privacy:** colour data only, never photos. Video frames are drawn to an in-memory canvas and reduced to 54 averaged colours. No frame or image is stored, uploaded or kept after sampling.
- **Camera light:** the camera stream is stopped (every track `stop()`ed) when the scanner closes, unmounts, or leaves the camera stage.
- **Scan guide orientation must match the Kociemba facelet layout** (`state.ts` `facelet()`):
  - green, red, blue and orange are scanned with white on top;
  - white is scanned with blue on top;
  - yellow is scanned with green on top.
  - The preview is not mirrored, so what the user sees is what is sampled.
- **Letter labels in the editor:** `W` white (U), `Y` yellow (D), `R` red (R), `O` orange (L), `G` green (F), `B` blue (B). Sticker colours match `FACE_COLORS` in `CubeViewer.tsx`.
- `web/src/scan/**` may import `@/cube/*` and `@/solver/*`. `web/src/solver/**` still imports only `@/cube/*`.
- **No new npm dependencies.**
- **Code style:** single quotes, no semicolons, 2-space indent, ~120 columns. Do not run prettier.
- **Next.js:** read the relevant guide in `web/node_modules/next/dist/docs/` before touching Next.js code.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.

## Review Focus

1. **Camera blocked, missing, busy, or page not secure** (a phone opening the dev server over plain http): a plain message with a way forward ("Try again" where it can help, always "Enter colours by hand"), never a blank or frozen overlay. Tests in Task 5; browser check in Task 6.
2. **The camera light goes off** when the scanner closes, unmounts, or moves to the review screen. Test of `stopStream` in Task 5; browser check (track `readyState === 'ended'`) in Task 6.
3. **A misread sticker:** the review screen names the problem and marks the likely stickers. "Solve this cube" stays disabled until the cube is valid, and a solver error never crashes the UI. Tests in Task 2; browser check in Task 7.
4. **A correctly held real cube gives the right state:** the guide's "on top" colours agree with the facelet layout. Round-trip and geometry tests in Task 4.
5. **Retaking one face replaces only that face; the solved-in-garden cube looks exactly as scanned** (white on top, green in front). Tests in Tasks 3 and 5.

---

## File Structure

| File | Responsibility |
|---|---|
| `web/src/scan/colour.ts` | `RGB` type, sRGB → Lab, colour distance |
| `web/src/scan/classify.ts` | 54 samples → facelet string + per-sticker confidence |
| `web/src/scan/validate.ts` | counts, impossible pieces, twist, flip, parity, with messages and sticker indices |
| `web/src/solver/startMoves.ts` | `startMovesFor(state, moves)`: a move list that builds `state` from solved |
| `web/src/scan/faces.ts` | scan order, instructions, letters, sticker colours |
| `web/src/scan/sample.ts` | grid rectangle and per-cell average colour of an RGBA frame |
| `web/src/scan/scanFlow.ts` | scan-flow reducer (capture, retake, manual, edit, restart) |
| `web/src/scan/camera.ts` | camera support check, error → status, status copy, `stopStream` |
| `web/src/scan/useCamera.ts` | React hook around `getUserMedia` |
| `web/src/scan/Scanner.tsx`, `CubeNet.tsx`, `scanner.module.css` | overlay UI |
| `web/src/garden/GardenPage.tsx`, `hotspots.ts` | open the scanner from the camera; play the scanned solve |
| `web/package.json` | `dev:https` script for phones |

---

### Task 1: Colour maths and classification

**Files:** Create `web/src/scan/colour.ts`, `web/src/scan/classify.ts`; Test `web/src/scan/colour.test.ts`, `web/src/scan/classify.test.ts`

**Interfaces:**
- Produces:
  - `type RGB = [number, number, number]` (0–255)
  - `rgbToLab(c: RGB): [number, number, number]`, sRGB with D65 white
  - `colourDistance(a: RGB, b: RGB): number`, CIE76 ΔE in Lab
  - `classify(samples: RGB[]): { state: string; confidence: number[] }`. `samples` has 54 entries in facelet order (U R F D L B, nine each, row-major).

**Algorithm (`classify`):**
- Centres (indices 4, 13, 22, 31, 40, 49) are their own face letters by definition.
- **Pass 1, references = the six centre samples.**
  - For every non-centre sticker and every face letter, compute the distance to that letter's reference.
  - Sort all (sticker, letter) pairs by distance, ascending.
  - Walk the sorted list. Assign a sticker to a letter if the sticker is still unassigned and the letter has fewer than 8 non-centre stickers.
  - This balanced greedy assignment always gives nine of each colour.
- **Pass 2:** take the Lab mean of each letter's nine assigned samples as the new references, and repeat the assignment.
- **Confidence:** `confidence[i]` = (second-smallest distance − smallest distance) to the final references. Centres get `Infinity`.

- [ ] **Step 1: Failing tests**

```ts
// colour.test.ts
test('white is L≈100, a≈0, b≈0 and black is L=0', () => {
  const [l, a, b] = rgbToLab([255, 255, 255])
  expect(l).toBeCloseTo(100, 0); expect(Math.abs(a)).toBeLessThan(0.5); expect(Math.abs(b)).toBeLessThan(0.5)
  expect(rgbToLab([0, 0, 0])[0]).toBeCloseTo(0, 5)
})
test('red is closer to orange than to blue', () => {
  expect(colourDistance([190, 30, 40], [240, 110, 30])).toBeLessThan(colourDistance([190, 30, 40], [20, 70, 190]))
})
// classify.test.ts
const PALETTE: Record<string, RGB> = {
  U: [235, 235, 230], D: [230, 210, 40], R: [190, 30, 40], L: [240, 110, 30], F: [30, 160, 70], B: [20, 70, 190],
}
const paint = (state: string) => state.split('').map((c) => PALETTE[c])
test('exact palette colours classify back to the state', () => {
  const s = applyMoves(SOLVED, scramble(25, mulberry32(3)))
  expect(classify(paint(s)).state).toBe(s)
})
test.each(Array.from({ length: 50 }, (_, i) => i))('scramble %i survives per-face lighting and noise', (i) => {
  const rng = mulberry32(500 + i)
  const s = applyMoves(SOLVED, scramble(25, rng))
  const samples = paint(s).map((c, k) => {
    const light = 0.75 + 0.3 * ((Math.floor(k / 9) * 7919) % 11) / 10 // 0.75..1.05 per face
    return c.map((v) => Math.max(0, Math.min(255, v * light + (rng() - 0.5) * 24))) as RGB
  })
  expect(classify(samples).state).toBe(s)
})
test('a sticker halfway between red and orange gets low confidence', () => {
  const samples = paint(SOLVED)
  samples[0] = [215, 70, 35] // a U sticker that looks red-orange
  const { confidence } = classify(samples)
  const others = confidence.filter((_, i) => i !== 0 && Number.isFinite(confidence[i]))
  expect(confidence[0]).toBeLessThan(Math.min(...others))
})
test('every colour appears nine times', () => {
  const noisy = paint(SOLVED).map(() => [128, 128, 128] as RGB)
  const counts = [...classify(noisy).state].reduce<Record<string, number>>((m, c) => ({ ...m, [c]: (m[c] ?? 0) + 1 }), {})
  expect(Object.values(counts)).toEqual([9, 9, 9, 9, 9, 9])
})
```

- [ ] **Step 2: Run**: `cd web && npx vitest run src/scan`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement** both modules per the algorithm above.
- [ ] **Step 4: Run**: Expected PASS.
- [ ] **Step 5: Commit**: `feat(scan): colour maths and sticker classification`

---

### Task 2: Validity checks

**Files:** Create `web/src/scan/validate.ts`; Test `web/src/scan/validate.test.ts`

**Interfaces:**
- Consumes `EDGE_SLOTS`, `CORNER_SLOTS`, `sticker`, `slotFaces` from `@/solver/pieces`, and `faceletIndex` from `@/cube/state`.
- Produces:

```ts
export type Problem = 'length' | 'centres' | 'count' | 'pieces' | 'twist' | 'flip' | 'parity'
export type Validation = { ok: true } | { ok: false; problem: Problem; message: string; stickers: number[] }
export function validateState(state: string): Validation
export const COLOUR_WORDS: Record<string, string> // U 'white', D 'yellow', R 'red', L 'orange', F 'green', B 'blue'
```

**Checks**, in order; the first failure wins:

| Problem | Condition | `stickers` | `message` |
|---|---|---|---|
| `length` | not 54 characters of `URFDLB` | `[]` | `The cube needs 54 stickers.` |
| `centres` | centres not `U R F D L B` at 4, 13, 22, 31, 40, 49 | those indices | `The centre stickers are in the wrong places.` |
| `count` | any letter ≠ 9 | non-centre stickers of every over-count colour | `Each colour should appear 9 times. Too many: <colour (n), …>. Too few: <colour (n), …>.` |
| `pieces` | a corner's or edge's colour set isn't a real piece (e.g. two whites, white with yellow), or a real piece appears twice | every sticker of those pieces | `Some pieces have colour combinations a real cube doesn't have. Check the marked stickers.` |
| `twist` | sum of corner orientations mod 3 ≠ 0 | `[]` | `One corner looks twisted, so a corner sticker was probably misread. Check the marked stickers.` |
| `flip` | sum of edge orientations mod 2 ≠ 0 | `[]` | `One edge looks flipped, so an edge sticker was probably misread. Check the marked stickers.` |
| `parity` | corner permutation parity ≠ edge permutation parity | `[]` | `Two pieces look swapped. Check the marked stickers against your cube.` |

The twist, flip and parity checks can't tell which sticker is wrong. For those the UI marks the least-confident stickers (Task 6).

**Orientation definitions** (Kociemba). Each slot lists its faces in reference order:
- **Corners:** `UFR: U R F`, `UFL: U F L`, `UBL: U L B`, `UBR: U B R`, `DFR: D F R`, `DFL: D L F`, `DBL: D B L`, `DBR: D R B`.
  - Orientation = the position (0, 1 or 2) in that list of the face showing a `U` or `D` colour.
- **Edges:** `UR: U R`, `UF: U F`, `UL: U L`, `UB: U B`, `DR: D R`, `DF: D F`, `DL: D L`, `DB: D B`, `FR: F R`, `FL: F L`, `BL: B L`, `BR: B R`.
  - Orientation = 0 if the first face shows `U` or `D`.
  - For a piece with no `U`/`D` colour, orientation = 0 if the first face shows `F` or `B`.
  - Otherwise orientation = 1.
- **Parity:** map each slot to the home slot of the piece it holds (by colour set), then compare the permutation parity of corners and edges.

- [ ] **Step 1: Failing tests**

```ts
test('solved and 1000 scrambles are valid', () => {
  expect(validateState(SOLVED)).toEqual({ ok: true })
  for (let i = 0; i < 1000; i++) expect(validateState(applyMoves(SOLVED, scramble(25, mulberry32(i + 1))))).toEqual({ ok: true })
})
test.each([
  ['length', SOLVED.slice(1)],
  ['centres', swap(SOLVED, 4, 13)],
  ['count', set(SOLVED, 0, 'R')],
  ['pieces', set(set(SOLVED, 8, 'D'), 35, 'U')],          // two corners become copies of other corners
  ['twist', cycle(SOLVED, 8, 9, 20)],
  ['flip', swap(SOLVED, 7, 19)],
  ['parity', swap(swap(SOLVED, 7, 5), 19, 10)],           // UF and UR edges exchanged
] as const)('%s problem is found', (problem, s) => {
  const v = validateState(s)
  expect(v.ok).toBe(false)
  if (!v.ok) expect(v.problem).toBe(problem)
})
test('the problems also show up on scrambled cubes', () => {
  const s = applyMoves(SOLVED, scramble(25, mulberry32(77)))
  const flippedAt = (state: string, slot: EdgeSlot) => {
    const [a, b] = slotFaces(slot).map((f) => faceletIndex(f, slotPos(slot)))
    return swap(state, a, b)
  }
  expect(validateState(flippedAt(s, 'FR'))).toMatchObject({ ok: false, problem: 'flip' })
})
test('count message names the colours', () => {
  const v = validateState(set(SOLVED, 0, 'R'))
  expect(v).toMatchObject({ ok: false, message: 'Each colour should appear 9 times. Too many: red (10). Too few: white (8).' })
  if (!v.ok) expect(v.stickers).toContain(0)
})
test('pieces problem marks the stickers of the bad corner', () => {
  const v = validateState(set(set(SOLVED, 8, 'D'), 35, 'U'))
  if (v.ok) throw new Error('expected a problem')
  expect(v.stickers).toEqual(expect.arrayContaining([8, 9, 20]))
})
```

Write the small helpers `swap`, `set` and `cycle` in the test file. `slotPos` can be built locally from the slot letters, the same way as in `pieces.ts`.

- [ ] **Step 2: Run**: Expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `cd web && npx vitest run src/scan`: Expected PASS.
- [ ] **Step 5: Commit**: `feat(scan): validity checks with likely-error stickers`

---

### Task 3: Start moves for a scanned cube

**Files:** Create `web/src/solver/startMoves.ts`; Test `web/src/solver/startMoves.test.ts`

**Interfaces:**
- Produces `startMovesFor(state: string, moves: Move[]): Move[]`. Its result `r` satisfies `applyMoves(SOLVED, r) === state`.
- **Method:**
  - The solve ends on a whole-cube rotation of `SOLVED`: `end = applyMoves(state, moves)`.
  - Find the rotation `rot` among the 24 with `applyMoves(SOLVED, rot) === end`.
  - Build the 24 as: top choices `[]`, `[x]`, `[x2]`, `[x']`, `[z]`, `[z']`, each followed by `y` turns 0–3.
  - Return `[...rot, ...invertMoves(moves)]`.
  - If no rotation matches, throw `Error('not a rotation of solved')`.

- [ ] **Step 1: Failing tests**

```ts
test.each(Array.from({ length: 100 }, (_, i) => i))('scramble %i: start moves rebuild the state', (i) => {
  const s = applyMoves(SOLVED, scramble(25, mulberry32(4000 + i)))
  const { moves } = solve(s)
  const start = startMovesFor(s, moves)
  expect(applyMoves(SOLVED, start)).toBe(s)
  expect(allFacesSolved(applyMoves(SOLVED, [...start, ...moves]))).toBe(true)
})
test('the viewer pose after the start moves shows the state (white up, green front)', () => {
  const s = applyMoves(SOLVED, scramble(25, mulberry32(9)))
  const start = startMovesFor(s, solve(s).moves)
  const whiteCentre = poseAfter(start).find((c) => c.home.join() === '0,1,0')!
  expect(cubiePosition(whiteCentre)).toEqual([0, 1, 0])
})
```

The test may import `solve` and `allFacesSolved` from the solver, and `poseAfter` and `cubiePosition` from `@/cube/pose`. Test files are exempt from the solver import rule.

- [ ] **Step 2: Run**: Expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `cd web && npx vitest run src/solver`: Expected PASS.
- [ ] **Step 5: Commit**: `feat(solver): start moves that rebuild a scanned cube`

---

### Task 4: Scan guide and frame sampling

**Files:** Create `web/src/scan/faces.ts`, `web/src/scan/sample.ts`; Test `web/src/scan/faces.test.ts`, `web/src/scan/sample.test.ts`

**Interfaces:**
- `faces.ts`:

```ts
export interface ScanFace { face: Face; colour: string; top: Face; instruction: string }
export const SCAN_ORDER: ScanFace[]
export const LETTERS: Record<Face, string>      // U 'W', D 'Y', R 'R', L 'O', F 'G', B 'B'
export const STICKER_HEX: Record<Face, string>   // R '#ff1f2d', L '#ff6a00', U '#fafafa', D '#ffe000', F '#00c853', B '#0a55ff'
export function assemble(samplesByScan: RGB[][]): RGB[] // SCAN_ORDER-indexed faces → 54 samples in facelet order
```

| # | face | colour | top | instruction |
|---|---|---|---|---|
| 0 | F | green | U | `Hold the cube with white on top and green facing the camera.` |
| 1 | R | red | U | `Keep white on top. Turn the cube so red faces the camera.` |
| 2 | B | blue | U | `Keep white on top. Turn again so blue faces the camera.` |
| 3 | L | orange | U | `Keep white on top. Turn again so orange faces the camera.` |
| 4 | U | white | B | `Tip the cube so white faces the camera, with blue on top.` |
| 5 | D | yellow | F | `Now show yellow to the camera, with green on top.` |

- `sample.ts`:
  - `gridRect(width: number, height: number): { x: number; y: number; size: number }`: a square of side `floor(0.6 × min(width, height))`, centred, with floored integer coordinates.
  - `sampleGrid(pixels: Uint8ClampedArray, width: number, height: number): RGB[]`: 9 averages in row-major order. Each average covers the central 50% box of its third of `gridRect`.

- [ ] **Step 1: Failing tests**

```ts
// faces.test.ts
test('each scan face has the right neighbour on top in the facelet layout', () => {
  // Row 0, column 1 of a face sits on the edge it shares with its top neighbour.
  for (const { face, top } of SCAN_ORDER) {
    const slot = EDGE_SLOTS.find((e) => [...e].sort().join() === [face, top].sort().join())!
    expect(faceletIndex(face, slotPosition(slot))).toBe(FACES.indexOf(face) * 9 + 1)
  }
})
test('assemble puts each scanned face in its facelet block', () => {
  const byScan = SCAN_ORDER.map((_, k) => Array.from({ length: 9 }, () => [k, k, k] as RGB))
  const all = assemble(byScan)
  SCAN_ORDER.forEach(({ face }, k) => expect(all[FACES.indexOf(face) * 9 + 4]).toEqual([k, k, k]))
})
// sample.test.ts
function frame(width: number, height: number, cells: RGB[]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(width * height * 4).fill(40)
  const { x, y, size } = gridRect(width, height)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    for (let py = y + Math.floor((r * size) / 3); py < y + Math.floor(((r + 1) * size) / 3); py++)
      for (let pxl = x + Math.floor((c * size) / 3); pxl < x + Math.floor(((c + 1) * size) / 3); pxl++) {
        const i = (py * width + pxl) * 4; px.set([...cells[r * 3 + c], 255], i)
      }
  return px
}
test('gridRect is a centred 60% square', () => {
  expect(gridRect(320, 240)).toEqual({ x: 88, y: 48, size: 144 })
})
test('sampleGrid reads each cell, row by row', () => {
  const cells = Array.from({ length: 9 }, (_, i) => [i * 20, 255 - i * 20, 100] as RGB)
  expect(sampleGrid(frame(320, 240, cells), 320, 240)).toEqual(cells)
})
test('round trip: painted faces of a scramble classify back to it', () => {
  const s = applyMoves(SOLVED, scramble(25, mulberry32(12)))
  const byScan = SCAN_ORDER.map(({ face }) => {
    const block = s.slice(FACES.indexOf(face) * 9, FACES.indexOf(face) * 9 + 9).split('')
    return sampleGrid(frame(320, 240, block.map((c) => PALETTE[c])), 320, 240)
  })
  expect(classify(assemble(byScan)).state).toBe(s)
})
```

`FACES` is `['U','R','F','D','L','B']`. `slotPosition` is a local test helper. `PALETTE` is the one from Task 1, exported from a shared test fixture `web/src/scan/testPalette.ts`.

- [ ] **Step 2: Run**: Expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**: Expected PASS.
- [ ] **Step 5: Commit**: `feat(scan): scan guide and grid sampling`

---

### Task 5: Scan flow and camera helpers

**Files:** Create `web/src/scan/scanFlow.ts`, `web/src/scan/camera.ts`; Test `web/src/scan/scanFlow.test.ts`, `web/src/scan/camera.test.ts`

**Interfaces:**
- `scanFlow.ts`:

```ts
export interface ScanState {
  stage: 'camera' | 'review'
  face: number                      // SCAN_ORDER index being captured
  samples: (RGB[] | null)[]         // by SCAN_ORDER index, 6 entries
  state: string | null              // facelet string under review
  confidence: number[] | null       // from classify; null for hand-entered cubes
}
export type ScanAction =
  | { type: 'capture'; samples: RGB[] }
  | { type: 'retake'; face: number }
  | { type: 'manual' }
  | { type: 'setSticker'; index: number; letter: Face }
  | { type: 'restart' }
export const initialScan: ScanState
export function scanReducer(s: ScanState, a: ScanAction): ScanState
```

- **`capture`:** stores the samples at `face`. It then moves to the first face still missing. If none is missing, it goes to `review`, with `state` and `confidence` from `classify(assemble(samples))`. Re-classifying drops any earlier hand edits.
- **`retake`:** goes to `camera` at that face and keeps the other faces.
- **`manual`:** goes to `review` with `state` = the current state, or `SOLVED` if there is none, and `confidence: null`.
- **`setSticker`:** changes one sticker. Centres are ignored.
- **`restart`:** returns `initialScan`.

- `camera.ts`:

```ts
export type CameraStatus = 'idle' | 'starting' | 'live' | 'insecure' | 'unsupported' | 'denied' | 'unavailable' | 'busy' | 'failed'
export function cameraSupport(env: { isSecureContext: boolean; hasGetUserMedia: boolean }): 'ok' | 'insecure' | 'unsupported'
export function cameraErrorStatus(error: unknown): 'denied' | 'unavailable' | 'busy' | 'failed'
export const CAMERA_MESSAGES: Record<'insecure' | 'unsupported' | 'denied' | 'unavailable' | 'busy' | 'failed', string>
export function canRetry(status: CameraStatus): boolean    // false for insecure and unsupported
export function stopStream(stream: { getTracks(): { stop(): void }[] } | null): void
```

**Error mapping** (by `error.name`):

| Error name | Status |
|---|---|
| `NotAllowedError`, `SecurityError` | `denied` |
| `NotFoundError`, `OverconstrainedError` | `unavailable` |
| `NotReadableError`, `AbortError` | `busy` |
| anything else | `failed` |

**Messages:**
- **insecure:** `The camera only works on a secure (https) page. Open this page over https, or enter the colours by hand.`
- **unsupported:** `This browser can't use a camera. You can enter the colours by hand.`
- **denied:** `Camera access was blocked. Allow the camera in your browser's site settings and try again, or enter the colours by hand.`
- **unavailable:** `No camera was found. You can enter the colours by hand.`
- **busy:** `The camera is being used by another app. Close it and try again, or enter the colours by hand.`
- **failed:** `The camera couldn't start. Try again, or enter the colours by hand.`

- [ ] **Step 1: Failing tests**

```ts
// scanFlow.test.ts
const faceSamples = (s: string, k: number) =>
  s.slice(FACES.indexOf(SCAN_ORDER[k].face) * 9, FACES.indexOf(SCAN_ORDER[k].face) * 9 + 9).split('').map((c) => PALETTE[c])
const scanAll = (s: string) => SCAN_ORDER.reduce((st, _, k) => scanReducer(st, { type: 'capture', samples: faceSamples(s, k) }), initialScan)
test('six captures lead to review with the scanned state', () => {
  const s = applyMoves(SOLVED, scramble(25, mulberry32(5)))
  expect(scanAll(s)).toMatchObject({ stage: 'review', state: s })
})
test('retaking one face replaces only that face', () => {
  const s = applyMoves(SOLVED, scramble(25, mulberry32(5)))
  const reviewed = scanAll(s)
  const retake = scanReducer(reviewed, { type: 'retake', face: 2 })
  expect(retake).toMatchObject({ stage: 'camera', face: 2 })
  const again = scanReducer(retake, { type: 'capture', samples: faceSamples(s, 2) })
  expect(again).toMatchObject({ stage: 'review', state: s })
  expect(again.samples.filter((x, k) => k !== 2)).toEqual(reviewed.samples.filter((x, k) => k !== 2))
})
test('manual entry starts from solved; centres cannot be edited', () => {
  const m = scanReducer(initialScan, { type: 'manual' })
  expect(m).toMatchObject({ stage: 'review', state: SOLVED, confidence: null })
  expect(scanReducer(m, { type: 'setSticker', index: 4, letter: 'R' }).state).toBe(SOLVED)
  expect(scanReducer(m, { type: 'setSticker', index: 0, letter: 'R' }).state![0]).toBe('R')
})
// camera.test.ts
test('support needs a secure page and getUserMedia', () => {
  expect(cameraSupport({ isSecureContext: false, hasGetUserMedia: true })).toBe('insecure')
  expect(cameraSupport({ isSecureContext: true, hasGetUserMedia: false })).toBe('unsupported')
  expect(cameraSupport({ isSecureContext: true, hasGetUserMedia: true })).toBe('ok')
})
test.each([
  ['NotAllowedError', 'denied'], ['SecurityError', 'denied'], ['NotFoundError', 'unavailable'],
  ['OverconstrainedError', 'unavailable'], ['NotReadableError', 'busy'], ['TypeError', 'failed'],
])('%s maps to %s', (name, status) => {
  expect(cameraErrorStatus(Object.assign(new Error('x'), { name }))).toBe(status)
})
test('every failure message offers entering colours by hand', () => {
  Object.values(CAMERA_MESSAGES).forEach((m) => expect(m).toMatch(/enter the colours by hand/))
  expect(canRetry('denied')).toBe(true); expect(canRetry('insecure')).toBe(false)
})
test('stopStream stops every track and accepts null', () => {
  const stopped: number[] = []
  stopStream({ getTracks: () => [0, 1].map((i) => ({ stop: () => stopped.push(i) })) })
  expect(stopped).toEqual([0, 1])
  expect(() => stopStream(null)).not.toThrow()
})
```

- [ ] **Step 2: Run**: Expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `cd web && npx vitest run src/scan`: Expected PASS.
- [ ] **Step 5: Commit**: `feat(scan): scan flow and camera helpers`

---

### Task 6: Scanner overlay

**Files:** Create `web/src/scan/useCamera.ts`, `web/src/scan/Scanner.tsx`, `web/src/scan/CubeNet.tsx`, `web/src/scan/scanner.module.css`

**Interfaces:**
- `useCamera(active: boolean): { status: CameraStatus; videoRef: RefObject<HTMLVideoElement | null>; retry(): void }`
  - While `active`, it checks `cameraSupport`, then calls `getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })` and attaches the stream to the video.
  - When `active` turns false, on unmount, and before a retry, it calls `stopStream`. A stream that resolves after deactivation is stopped at once.
- `Scanner({ onClose, onSolved }: { onClose(): void; onSolved(result: { state: string; solution: Solution }): void })`
- `CubeNet({ state, marked, onPick }: { state: string; marked: number[]; onPick(index: number): void })`

**Layout and behaviour:**
- **Overlay:** full screen and fixed, with a soft backdrop over the garden. A card centred, max 560 px wide, with a close button (`aria-label="Close scanner"`) and Escape to close.
- **Camera stage:**
  - Heading `Scan face <k+1> of 6` and the face's `instruction`.
  - A square preview box: `aspect-ratio: 1`, width `min(86vw, 52vh, 420px)`, `<video playsInline muted>` with `object-fit: cover`, not mirrored.
  - A 3×3 grid overlay at 20% inset (the 60% square, matching `gridRect`). Each cell shows the live sampled colour as a small swatch. The centre cell outline uses the expected centre colour.
  - Sampling runs about 10 times a second: draw the video to an offscreen canvas scaled so its short side is 240 px, then `getImageData` and `sampleGrid`. The canvas is reused and never read into an image or URL.
  - A row of six small face chips: captured ones show a tick, and clicking a captured one retakes it.
  - Buttons: `Capture` (disabled until `live`), `Enter colours by hand`.
  - When the status is a failure, the preview area shows `CAMERA_MESSAGES[status]`, plus `Try again` if `canRetry`.
- **Review stage:**
  - `CubeNet` laid out as a cross: U above F; L F R B in a row; D below F. Each sticker is a button showing its letter on its colour, with an aria-label like `Front face, row 1, column 2: green`. Centre stickers are disabled.
  - Picking a sticker opens a palette of six letter buttons under the net; choosing one dispatches `setSticker`.
  - A status line: `Looks like a real cube. Ready to solve.` when valid, else the validation message.
  - Marked stickers get a red ring. For twist, flip and parity, mark the 4 non-centre stickers with the lowest `confidence` (none when `confidence` is null).
  - Buttons: `Solve this cube` (disabled unless valid), `Rescan a face` (returns to the camera at face 0 with all samples kept; the chips pick a face), `Start over`.
- **Solve this cube:** calls `solve(state)` in try/catch. On success it calls `onSolved({ state, solution })`. On an error it shows `This cube can't be solved as entered. Check the colours against your cube.`
- The camera is active only while `stage === 'camera'` and the scanner is mounted.

- [ ] **Step 1: Build the components** per the layout above. (UI only; the logic they call is already tested in Tasks 1–5.)
- [ ] **Step 2: Verify**: `cd web && npm test && npx tsc --noEmit && npx eslint src`. Expected: all green.
- [ ] **Step 3: Commit**: `feat(scan): scanner overlay with camera preview and colour editor`

(Browser verification of the overlay happens in Task 7, once it is reachable from the garden.)

---

### Task 7: Open the scanner from the garden and play the scanned solve

**Files:**
- Modify: `web/src/garden/GardenPage.tsx`, `web/src/garden/hotspots.ts` (+ test), `web/package.json`

**Interfaces:**
- `HOTSPOT_MESSAGES` drops `camera`: its type becomes `Record<Exclude<HotspotKey, 'camera'>, string>`. Clicking the camera opens the scanner instead of a toast.
- In `GardenPage`, the `Puzzle` field `scrambleMoves` is renamed `startMoves`.
  - A scramble uses its scramble moves as the start.
  - A scan uses `startMovesFor(state, solution.moves)`.
- Opening the scanner pauses playback.
- `onSolved` sets the new puzzle, dispatches `{ type: 'reset', playing: !env.reducedMotion }` and closes the scanner.
- `package.json` gets `"dev:https": "next dev --experimental-https -H 0.0.0.0"`, for phones on the local network. The certificate is self-signed for localhost, so a phone shows a warning to accept once.

- [ ] **Step 1: Failing test**: update `hotspots.test.ts` so the keys are `['butterfly', 'cube', 'sign']`, and run it. Expected FAIL.
- [ ] **Step 2: Implement** the changes above. Run `cd web && npm test && npx tsc --noEmit && npx eslint src && npm run build`. Expected: all green.
- [ ] **Step 3: Browser verification** on `http://localhost:3000` (localhost counts as a secure page). Before the page loads, replace `navigator.mediaDevices.getUserMedia` with one that returns `canvas.captureStream()` from a canvas that paints `window.__fakeFace`, a 9-letter string drawn as a 3×3 grid in the `gridRect` area using the Task 1 palette. Check:
  - Clicking the camera opens the scanner. The instruction for face 1 shows, and the live swatches match the painted face.
  - Capturing six faces of a known scramble reaches review with no problem. Solve closes the scanner, and the garden cube matches the scanned state (white up, green front) and plays to `Solved!`.
  - After closing the scanner, the fake stream's tracks are `ended`.
  - Editing one sticker in review shows the count message, marks stickers and disables Solve.
  - With `getUserMedia` rejecting `NotAllowedError`, the blocked message shows with Try again and Enter colours by hand. Entering by hand opens the editor on a solved cube.
  - At 390×844 the overlay fits without horizontal scrolling, and the preview and Capture button are visible together.
- [ ] **Step 4: Commit**: `feat: scan a cube from the garden camera and play its solve`
