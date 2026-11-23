# Beginner Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Solve any valid 3x3 cube state with the beginner layer-by-layer method, as a list of named, explained steps, and play that solve in the garden instead of the reversed-scramble demo.

**Architecture:** A pure TypeScript solver in `web/src/solver/` (no React, no three.js) works on the existing 54-facelet string. Each stage is a function that reads the current case, picks a standard algorithm and appends a `Step` to a builder. Whole-cube turns (x, y, z) join the move model so the solver can say "turn the cube" and then use the textbook algorithm from the textbook angle. The garden page solves a scramble, plays the flattened moves and shows the current step's name, algorithm and "why" in the banner.

**Tech Stack:** TypeScript (strict), vitest, Next.js 16 App Router, @react-three/fiber (viewer already built in plan 1).

**Spec:** `docs/superpowers/specs/2026-11-22-rubiks-garden-design.md` (subsystem 2).

## Global Constraints

- Beginner layer-by-layer method only; every step names its stage, its case and a standard algorithm, plus a one- or two-sentence "why" (spec: "what + why"; anti-goal: steps that cannot be named as human techniques).
- 3x3 only. No Kociemba, no search-based optimal solving, no new npm dependencies.
- `web/src/solver/**` imports only from `@/cube/*` (and `@/garden/layout/random` in tests). No React or three.js there.
- Cube orientation convention: input states have their centres at home (`U R F D L B` at indices 4, 13, 22, 31, 40, 49). The solve always begins with `z2` so white is on the bottom and yellow on top; every check after that compares stickers with the current centres, never with fixed letters.
- Colour names for copy: label `U` white, `D` yellow, `F` green, `B` blue, `R` red, `L` orange (matches `FACE_COLORS` in `CubeViewer.tsx`).
- Code style as in plan 1: single quotes, no semicolons, 2-space indent, lines up to ~120. The repo has no prettier config. Do not run prettier.
- Read the relevant guide in `web/node_modules/next/dist/docs/` before touching Next.js code (web/AGENTS.md).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.

## Review Focus

1. Invalid or unsolvable input (one flipped edge, one twisted corner, two swapped edges, wrong length or colour counts, centres not at home): `solve` throws `UnsolvableError` quickly. It must never loop forever and never report a solve that doesn't end solved. Tests in Task 7.
2. An already-solved cube, or a stage already finished mid-solve: no empty steps. A solved input gives only the `z2` hold step. Tests in Tasks 3 and 7.
3. Turn direction of x, y and z must agree between the facelet model and the 3D viewer, or the animation will not match the explanation. Tests in Task 1.
4. "New scramble" pressed mid-playback, with a shorter new solve: the player resets to move 0, the viewer rebuilds, and the banner never indexes past the end. Tests in Task 8 plus a browser check.
5. End of playback (move index equals the move count): the banner shows the finished message, not an out-of-range step. Tests in Task 8.

---

## File Structure

| File | Responsibility |
|---|---|
| `web/src/cube/moves.ts` | add `Rotation` (`x`/`y`/`z`) to `Move` |
| `web/src/cube/state.ts` | rotation permutations; export `faceletIndex` |
| `web/src/cube/layers.ts` | rotations turn all three layers |
| `web/src/solver/pieces.ts` | edge and corner slots, sticker lookup, finding pieces by colour |
| `web/src/solver/goals.ts` | one predicate per stage's end state |
| `web/src/solver/step.ts` | `Step` type, stage ids and names, `StepBuilder`, turn helpers |
| `web/src/solver/stages/firstLayer.ts` | hold, daisy, white cross, white corners |
| `web/src/solver/stages/middleLayer.ts` | middle-layer edges |
| `web/src/solver/stages/lastLayer.ts` | yellow cross, yellow edges, place corners, twist corners, finish |
| `web/src/solver/solve.ts` | input validation, stage order, `UnsolvableError` |
| `web/src/solver/progress.ts` | `stepAt` maps a move index to its step |
| `web/src/cube/usePlayer.ts` | add `reset` action |
| `web/src/ui/Overlay.tsx`, `overlay.module.css` | why line, setup line, New scramble button |
| `web/src/garden/GardenPage.tsx` | solve a scramble and play it |

---

### Task 1: Whole-cube turns x, y, z

**Files:**
- Modify: `web/src/cube/moves.ts`, `web/src/cube/state.ts`, `web/src/cube/layers.ts`
- Test: `web/src/cube/moves.test.ts`, `web/src/cube/state.test.ts`, `web/src/cube/layers.test.ts`, `web/src/cube/pose.test.ts`

**Interfaces:**
- Produces: `type Rotation = 'x' | 'y' | 'z'`; `Move = { face: Face | Rotation; turns: 1 | 2 | 3 }` (field keeps the name `face`); `parseMoves` accepts `x y z` with `'` and `2`; `formatMoves(ms: Move[]): string` (space-joined); `faceletIndex(face: Face, pos: [number, number, number]): number` from `state.ts`; `LayerTurn.layer: -1 | 1 | 'all'`.
- Semantics (WCA): `x` turns the whole cube like `R`, `y` like `U`, `z` like `F`.

- [ ] **Step 1: Write the failing tests**

```ts
// moves.test.ts
test('parses and formats whole-cube turns', () => {
  expect(parseMoves("x y' z2")).toEqual([{ face: 'x', turns: 1 }, { face: 'y', turns: 3 }, { face: 'z', turns: 2 }])
  expect(formatMoves(parseMoves("x y' z2 R"))).toBe("x y' z2 R")
})
// state.test.ts
test('x on a solved cube moves F to U, D to F, B to D, U to B', () => {
  expect(applyMove(SOLVED, { face: 'x', turns: 1 })).toBe(
    ['FFFFFFFFF', 'RRRRRRRRR', 'DDDDDDDDD', 'BBBBBBBBB', 'LLLLLLLLL', 'UUUUUUUUU'].join(''),
  )
})
test('y on a solved cube brings R to the front', () => {
  const s = applyMove(SOLVED, { face: 'y', turns: 1 })
  expect(s.slice(18, 27)).toBe('RRRRRRRRR')
  expect(s.slice(0, 9)).toBe('UUUUUUUUU')
})
test('z on a solved cube brings U to the right', () => {
  expect(applyMove(SOLVED, { face: 'z', turns: 1 }).slice(9, 18)).toBe('UUUUUUUUU')
})
test.each([
  ['x', 'U', 'F'], ['y', 'F', 'R'], ['z', 'U', 'L'],
] as const)('after %s, turning %s equals turning %s first', (rot, after, before) => {
  const start = applyMoves(SOLVED, scramble(15, mulberry32(9)))
  const r = { face: rot, turns: 1 } as const
  expect(applyMoves(start, [r, { face: after, turns: 1 }])).toBe(applyMoves(start, [{ face: before, turns: 1 }, r]))
})
test('faceletIndex finds the UF sticker on U and on F', () => {
  expect(faceletIndex('U', [0, 1, 1])).toBe(7)
  expect(faceletIndex('F', [0, 1, 1])).toBe(19)
})
// layers.test.ts
test('rotations turn every layer in the same direction as their face', () => {
  expect(layerTurn({ face: 'x', turns: 1 })).toEqual({ axis: 'x', layer: 'all', quarterTurns: -1 })
  expect(layerTurn({ face: 'y', turns: 3 })).toEqual({ axis: 'y', layer: 'all', quarterTurns: 1 })
  expect(cubieInLayer([-1, 0, 1], layerTurn({ face: 'z', turns: 2 }))).toBe(true)
})
// pose.test.ts
test('y moves the right centre cubie to the front, like U moves its edge', () => {
  const cubies = poseAfter([{ face: 'y', turns: 1 }])
  const rightCentre = cubies.find((c) => c.home.join() === '1,0,0')!
  expect(cubiePosition(rightCentre)).toEqual([0, 0, 1])
})
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `cd web && npx vitest run src/cube`
Expected: FAIL. The new tests fail on unknown tokens, missing `formatMoves` and `faceletIndex`, and an undefined permutation.

- [ ] **Step 3: Implement**

- `moves.ts`: extend the token regex to `[UDLRFBxyz]`.
- `state.ts`: build the x, y and z permutations with the existing `buildPermutation` logic, but without the layer filter. Rotate every facelet in the same sense as R, U and F respectively. Export `faceletIndex` from `INDEX_BY_KEY`, using the face's outward normal.
- `layers.ts`: map x, y, z to `{ axis, layer: 'all' }` with the clockwise sign of R, U, F (so `quarterTurns = -quarters`). `cubieInLayer` returns true for `'all'`.
- `scramble` keeps using faces only.

- [ ] **Step 4: Run the whole suite**

Run: `cd web && npm test && npx tsc --noEmit && npx eslint src`
Expected: all pass (141 + new); no type or lint errors (`CubeViewer` compiles unchanged).

- [ ] **Step 5: Commit**: `feat: whole-cube turns x, y, z`

---

### Task 2: Pieces and stage goals

**Files:**
- Create: `web/src/solver/pieces.ts`, `web/src/solver/goals.ts`
- Test: `web/src/solver/pieces.test.ts`, `web/src/solver/goals.test.ts`

**Interfaces:**
- Consumes: `faceletIndex`, `applyMove(s)`, `SOLVED` (Task 1).
- Produces:
  - `type EdgeSlot = 'UF'|'UR'|'UB'|'UL'|'DF'|'DR'|'DB'|'DL'|'FR'|'FL'|'BR'|'BL'`
  - `type CornerSlot = 'UFR'|'UFL'|'UBR'|'UBL'|'DFR'|'DFL'|'DBR'|'DBL'`
  - `EDGE_SLOTS`, `CORNER_SLOTS` (in that order)
  - `slotFaces(slot): Face[]` (letters of the slot name)
  - `sticker(state, slot, face): string`
  - `centre(state, face): string`
  - `findEdge(state, a, b): EdgeSlot`, `findCorner(state, a, b, c): CornerSlot` (colour order ignored)
  - `colourFace(state, slot, colour): Face` (which face of the slot shows that colour)
  - `COLOUR_NAMES: Record<string, string>`
  - `goals.ts`: `daisyDone`, `crossDone`, `firstLayerDone`, `middleDone`, `yellowCrossDone`, `yellowEdgesDone`, `cornersPlaced`, `allFacesSolved`, each `(state: string) => boolean`. Each includes the earlier goals, except `daisyDone` and `allFacesSolved`.
- Goal definitions (relative to centres): **white** = `centre(s,'D')`, **yellow** = `centre(s,'U')`.
  - daisy: all four U edges show white on U.
  - cross: all four D edges have their D sticker = D centre and their side sticker = side centre.
  - firstLayer: cross plus all four D corners solved (every sticker = its face's centre).
  - middle: plus FR, FL, BR, BL solved.
  - yellowCross: plus all U edges show yellow on U.
  - yellowEdges: plus U edges' side stickers = side centres.
  - cornersPlaced: plus each U corner's colour set equals its slot's centre colours.
  - allFacesSolved: each face's nine stickers are equal.

- [ ] **Step 1: Write the failing tests**

```ts
const R = applyMove(SOLVED, { face: 'R', turns: 1 })
test('sticker and centre read the solved cube', () => {
  expect(sticker(SOLVED, 'UF', 'F')).toBe('F')
  expect(sticker(SOLVED, 'DBL', 'L')).toBe('L')
  expect(centre(SOLVED, 'R')).toBe('R')
})
test('R moves the UR edge to BR with its white sticker on B', () => {
  expect(findEdge(R, 'R', 'U')).toBe('BR')
  expect(colourFace(R, 'BR', 'U')).toBe('B')
  expect(sticker(R, 'UR', 'U')).toBe('F')
})
test('findCorner ignores colour order', () => {
  expect(findCorner(SOLVED, 'R', 'U', 'F')).toBe('UFR')
  expect(findCorner(R, 'U', 'F', 'R')).toBe('UBR')
})
test('every goal holds on a solved cube and after z2', () => {
  for (const s of [SOLVED, applyMove(SOLVED, { face: 'z', turns: 2 })])
    for (const g of [crossDone, firstLayerDone, middleDone, yellowCrossDone, yellowEdgesDone, cornersPlaced, allFacesSolved])
      expect(g(s)).toBe(true)
})
test('one R breaks the cross goal, U breaks only the last-layer goals', () => {
  const z2 = applyMove(SOLVED, { face: 'z', turns: 2 })
  expect(crossDone(applyMove(z2, { face: 'R', turns: 1 }))).toBe(false)
  const u = applyMove(z2, { face: 'U', turns: 1 })
  expect(middleDone(u)).toBe(true)
  expect(yellowCrossDone(u)).toBe(true)
  expect(yellowEdgesDone(u)).toBe(false)
})
test('daisyDone: four white edges on top around yellow', () => {
  // After z2 white is on D; R2 L2 F2 B2 lifts all four white edges to U with white up.
  const s = applyMoves(SOLVED, parseMoves('z2 R2 L2 F2 B2'))
  expect(daisyDone(s)).toBe(true)
  expect(daisyDone(applyMove(SOLVED, { face: 'z', turns: 2 }))).toBe(false)
})
```

- [ ] **Step 2: Run them**: `npx vitest run src/solver`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement** both modules. Build the slot positions from slot letters (U = +y, D = −y, R = +x, L = −x, F = +z, B = −z) and look up the indices with `faceletIndex`.
- [ ] **Step 4: Run**: `npx vitest run src/solver`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(solver): piece lookup and stage goals`

---

### Task 3: Step builder, hold, daisy, white cross

**Files:**
- Create: `web/src/solver/step.ts`, `web/src/solver/stages/firstLayer.ts`
- Test: `web/src/solver/step.test.ts`, `web/src/solver/stages/firstLayer.test.ts`

**Interfaces:**
- Produces (`step.ts`):

```ts
export type StageId =
  | 'hold' | 'daisy' | 'cross' | 'corners' | 'middle'
  | 'yellowCross' | 'yellowEdges' | 'placeCorners' | 'twistCorners' | 'finish'
export const STAGE_NAMES: Record<StageId, string>
export interface Step {
  stage: StageId
  stageName: string
  caseName: string
  why: string
  setup: Move[]      // positioning: whole-cube turns and top-layer turns
  algorithm: Move[]  // the named algorithm (empty for a setup-only step)
  repeat: number     // times the algorithm is done; 0 when algorithm is empty
  moves: Move[]      // setup, then algorithm repeated `repeat` times: exactly what is played
}
export class UnsolvableError extends Error {}
export class StepBuilder {
  constructor(state: string)
  state: string                 // current state, updated by add()
  steps: Step[]
  /** Applies and records a step. Skips it entirely when it would have no moves. */
  add(stage: StageId, caseName: string, why: string, setup: Move[], algorithm: Move[], repeat?: number): void
}
/** The fewest turns of `face` (0..3) after which pred holds, as moves ([] for 0); throws UnsolvableError if none. */
export function turnsUntil(state: string, face: Face | Rotation, pred: (s: string) => boolean): Move[]
```

- `STAGE_NAMES`: hold `Hold the cube`, daisy `Daisy`, cross `White cross`, corners `White corners`, middle `Middle layer`, yellowCross `Yellow cross`, yellowEdges `Yellow edges`, placeCorners `Yellow corners: place`, twistCorners `Yellow corners: twist`, finish `Finish`.
- `turnsUntil` returns `[]`, `[{face,1}]`, `[{face,2}]` or `[{face,3}]`.
- Produces (`firstLayer.ts`): `hold(b)`, `daisy(b)`, `cross(b)`, and `whiteCorners(b)` in Task 4, each `(b: StepBuilder) => void`.

**Cases and copy** (white = D centre, as set by `hold`):

| Stage | Case name | Setup + algorithm | Why |
|---|---|---|---|
| hold | `Upside down` | algorithm `z2` | `Turn the cube over so white is on the bottom and yellow is on top. The beginner method builds the white layer first and finishes on yellow.` |
| daisy | `Edge on the bottom, white facing down` | U turns until the top spot above the edge is free, then that side twice (X2) | `Free the spot above it, then turn that side twice to lift the edge up with white facing up.` |
| daisy | `Edge in the middle layer` | U turns to free the spot above the edge's non-white face Y, then Y or Y′, whichever lifts it with white up | `Free the spot above, then turn the side once to lift the edge up with white facing up.` |
| daisy | `Edge on top, white facing out` | its side X once (either way), then the middle-layer case | `Turn its side once to drop the edge into the middle layer, then lift it back up with white facing up.` |
| daisy | `Edge on the bottom, white facing out` | free the spot above X, turn X once, then the middle-layer case | `Turn its side once to bring the edge into the middle layer, then lift it up with white facing up.` |
| cross | `<Colour> edge` (side colour name, capitalised, e.g. `Green edge`) | setup: U turns until the petal's side sticker matches the centre below it; algorithm X2 | `Line the edge up with its matching centre, then turn that side twice to bring it down next to the white centre.` |

- Daisy steps put their whole sequence in `algorithm` with empty `setup`, because the daisy is intuitive and has no named algorithm. Handle the white edges in `EDGE_SLOTS` order, one step per edge, skipping edges that are already petals. Petals are never disturbed: every side turn happens only after the U slot it touches is free.
- Cross: repeat until no petal is left on U: take the first petal in `EDGE_SLOTS` order, align it with U turns and drop it with X2 (one step per petal). Loop bounds: daisy at most 8 steps and cross at most 4; when a bound is exceeded, throw `UnsolvableError('daisy')` or `('cross')`.

- [ ] **Step 1: Write the failing tests**

```ts
// step.test.ts
test('add records setup + algorithm × repeat as moves and applies them', () => {
  const b = new StepBuilder(SOLVED)
  b.add('corners', 'Corner on top', 'why', parseMoves('y U'), parseMoves("R U R' U'"), 2)
  expect(formatMoves(b.steps[0].moves)).toBe("y U R U R' U' R U R' U'")
  expect(b.state).toBe(applyMoves(SOLVED, b.steps[0].moves))
  expect(b.steps[0].stageName).toBe('White corners')
})
test('add skips a step with no moves', () => {
  const b = new StepBuilder(SOLVED)
  b.add('finish', 'Line up the top', 'why', [], [])
  expect(b.steps).toEqual([])
})
test('turnsUntil finds the fewest U turns', () => {
  const s = applyMove(SOLVED, { face: 'U', turns: 1 })
  expect(turnsUntil(s, 'U', (x) => x === SOLVED)).toEqual([{ face: 'U', turns: 3 }])
  expect(turnsUntil(SOLVED, 'U', (x) => x === SOLVED)).toEqual([])
  expect(() => turnsUntil(SOLVED, 'U', () => false)).toThrow(UnsolvableError)
})
// firstLayer.test.ts — random scrambles, seeded
const states = Array.from({ length: 300 }, (_, i) => applyMoves(SOLVED, scramble(25, mulberry32(i + 1))))
test('hold is always z2', () => {
  const b = new StepBuilder(states[0]); hold(b)
  expect(b.steps.map((s) => formatMoves(s.moves))).toEqual(['z2'])
})
test.each(states.map((s, i) => [i, s]))('scramble %i: daisy then cross', (_, s) => {
  const b = new StepBuilder(s as string)
  hold(b); daisy(b)
  expect(daisyDone(b.state) || crossDone(b.state)).toBe(true)
  cross(b)
  expect(crossDone(b.state)).toBe(true)
  for (const step of b.steps) expect(step.moves.length).toBeGreaterThan(0)
})
// Rule: daisy and cross both do nothing when crossDone already holds.
test('a solved cube gets only the hold step through the cross', () => {
  const b = new StepBuilder(SOLVED); hold(b); daisy(b); cross(b)
  expect(b.steps.map((s) => s.stage)).toEqual(['hold'])
})
```

- [ ] **Step 2: Run**: `npx vitest run src/solver`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement** `step.ts` and `hold`, `daisy` and `cross` per the table.
- [ ] **Step 4: Run**: `npx vitest run src/solver`. Expected: PASS for all 300 scrambles.
- [ ] **Step 5: Commit**: `feat(solver): step builder, daisy and white cross`

---

### Task 4: White corners

**Files:** Modify `web/src/solver/stages/firstLayer.ts`; Test `web/src/solver/stages/firstLayer.test.ts`

**Interfaces:** Produces `whiteCorners(b: StepBuilder): void`.

| Case name | Setup | Algorithm | Why |
|---|---|---|---|
| `Corner on top` | y turns until the corner's target slot (its two non-white colours = F and R centres) is front-right, then U turns until the corner is at UFR | `R U R' U'`, repeat n = fewest of 1..5 that solves DFR | `Hold the corner's slot at front-right with the corner above it, then repeat R U R' U' until the white sticker faces down.` |
| `Corner stuck in the bottom` | y turns until the stuck corner is at DFR | `R U R' U'` once | `This corner is in the wrong spot or twisted. One R U R' U' lifts it to the top so it can be placed.` |

- Prefer corners already in the U layer (in `CORNER_SLOTS` order). Only when none is left, pop a stuck one. Bound: 8 steps, otherwise `UnsolvableError('corners')`.

- [ ] **Step 1: Failing test**: extend the 300-scramble test so that after `whiteCorners(b)` the check `firstLayerDone(b.state)` holds, and every `corners` step has `formatMoves(step.algorithm) === "R U R' U'"` and `1 <= step.repeat <= 5`.
- [ ] **Step 2: Run**: Expected FAIL (`whiteCorners` not exported).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**: `npx vitest run src/solver`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(solver): white corners`

---

### Task 5: Middle layer

**Files:** Create `web/src/solver/stages/middleLayer.ts`; Test `web/src/solver/stages/middleLayer.test.ts`

**Interfaces:** Produces `middleLayer(b: StepBuilder): void`.

| Case name | Setup | Algorithm | Why |
|---|---|---|---|
| `Edge goes right` | y then U turns until the edge is at UF with its F sticker = F centre (its U sticker = R centre) | `U R U' R' U' F' U F` | `Line the edge up with its front centre. Its top colour matches the right centre, so use the right-hand insert.` |
| `Edge goes left` | same, with its U sticker = L centre | `U' L' U L U F U' F'` | `Line the edge up with its front centre. Its top colour matches the left centre, so use the left-hand insert.` |
| `Edge stuck in the middle` | y turns until the stuck edge is at FR | `U R U' R' U' F' U F` | `This edge is in the wrong slot or flipped. One right-hand insert pops it out to the top layer.` |

- An edge belongs to the middle layer when it has no yellow (U centre) sticker. Prefer edges already in the U layer; pop a stuck one only when none is left. Bound: 12 steps, otherwise `UnsolvableError('middle')`.

- [ ] **Step 1: Failing test**: 300 seeded scrambles through hold, daisy, cross, whiteCorners and middleLayer; then `middleDone(b.state)` holds and every `middle` step's algorithm is one of the two inserts.
- [ ] **Step 2: Run**: Expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**: Expected PASS.
- [ ] **Step 5: Commit**: `feat(solver): middle layer`

---

### Task 6: Yellow cross and yellow edges

**Files:** Create `web/src/solver/stages/lastLayer.ts`; Test `web/src/solver/stages/lastLayer.test.ts`

**Interfaces:** Produces `yellowCross(b)`, `yellowEdges(b)`.

Algorithm checks already done against this cube model (2026-11-24):
- With yellow up, `F R U R' U' F'` turns an L at back-left (UB + UL) into a left-right line.
- It turns a left-right line (UL + UR) into the cross.
- It turns a dot into an L.
- With UB and UR correct, `R U R' U R U2 R' U` makes all four top edges match.

| Stage | Case name | Setup | Algorithm | Why |
|---|---|---|---|---|
| yellowCross | `Dot` | none | `F R U R' U' F'` | `No yellow edges are up yet. One F R U R' U' F' makes an L-shape.` |
| yellowCross | `L-shape` | U turns until yellow-up edges are UB and UL | `F R U R' U' F'` | `Hold the L at back-left, like 9 and 12 on a clock, then F R U R' U' F' turns it into a line.` |
| yellowCross | `Line` | U turns until yellow-up edges are UL and UR | `F R U R' U' F'` | `Hold the line left to right, then F R U R' U' F' completes the cross.` |
| yellowEdges | `All edges match` | U turns that make all four match | none | `Turn the top so every yellow edge matches the centre below it.` |
| yellowEdges | `Two neighbours match` | U turns that make two adjacent edges match, then y turns until they are at back and right | `R U R' U R U2 R' U` | `Hold the two correct edges at the back and right, then R U R' U R U2 R' U swaps the other two.` |
| yellowEdges | `Two opposite match` | U turns that make two opposite edges match | `R U R' U R U2 R' U` | `With opposite edges correct, one R U R' U R U2 R' U turns this into the neighbours case.` |

- Yellow cross: re-detect after each algorithm. One or three yellow edges up (a flipped edge) throws `UnsolvableError('yellowCross')`. Bound: 3 steps.
- Yellow edges: among U-turn counts 0..3 pick the one with the most matching edges (four beats two); fewer than two everywhere throws `UnsolvableError('yellowEdges')`. Bound: 3 steps.

- [ ] **Step 1: Failing tests**: the 300-scramble chain now ends with `yellowCrossDone` then `yellowEdgesDone`. Plus: a fixture with exactly one U edge flipped (swap the two stickers of UF on a solved z2 cube) throws `UnsolvableError`.
- [ ] **Step 2: Run**: Expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**: Expected PASS.
- [ ] **Step 5: Commit**: `feat(solver): yellow cross and yellow edges`

---

### Task 7: Yellow corners, finish, and `solve`

**Files:** Modify `web/src/solver/stages/lastLayer.ts`; Create `web/src/solver/solve.ts`; Test `web/src/solver/stages/lastLayer.test.ts`, `web/src/solver/solve.test.ts`

**Interfaces:**
- Produces `placeCorners(b)`, `twistCorners(b)`, `finish(b)`.
- Produces `solve(state: string): Solution`, where `Solution = { steps: Step[]; moves: Move[] }` and `moves` is every step's `moves` concatenated. Re-export `UnsolvableError` and `Step`.

Algorithm check done (2026-11-24): `U R U' L' U R' U' L` keeps the UFR corner in place and leaves every edge untouched.

| Stage | Case name | Setup | Algorithm | Why |
|---|---|---|---|---|
| placeCorners | `One corner in place` | y turns until a placed corner is at UFR | `U R U' L' U R' U' L`, repeat 1 or 2 (fewest that places all four) | `Hold the corner that is already in its spot at front-right, then U R U' L' U R' U' L moves the other three around it.` |
| placeCorners | `No corner in place` | none | `U R U' L' U R' U' L` once | `No corner is in its spot yet. One U R U' L' U R' U' L from any side puts one in place.` |
| twistCorners | `Twisted corner` | U turns (never y) until a corner without yellow up is at UFR | `R' D' R D`, repeat 2 or 4 (fewest that puts yellow up there) | `Bring a twisted corner to front-right and repeat R' D' R D until yellow faces up. The bottom looks scrambled for a moment; it fixes itself after the last corner.` |
| finish | `Line up the top` | none | U turns that solve every face | `Turn the top to line it up. The cube is solved!` |

- "Placed" means the corner's colour set equals its slot's centre colours, with any twist.
- placeCorners bound: 3 steps; no placed corner after the no-placed case throws. twistCorners bound: 4 steps; a corner needing other than 2 or 4 repeats throws. finish: when no U turn solves every face, throw `UnsolvableError('finish')`.
- `solve` validation, before any stage:
  - length 54;
  - only `UFRDLB`, nine of each;
  - centres at home.

  Otherwise it throws `UnsolvableError('invalid')`. Then it runs, in order: hold, daisy, cross, whiteCorners, middleLayer, yellowCross, yellowEdges, placeCorners, twistCorners, finish.

- [ ] **Step 1: Failing tests** (`solve.test.ts`)

```ts
const states = Array.from({ length: 1000 }, (_, i) => applyMoves(SOLVED, scramble(25, mulberry32(1000 + i))))
test('solves 1000 random scrambles; every step replays exactly', () => {
  let total = 0
  for (const s of states) {
    const { steps, moves } = solve(s)
    expect(allFacesSolved(applyMoves(s, moves))).toBe(true)
    expect(moves).toEqual(steps.flatMap((st) => st.moves))
    for (const st of steps)
      expect(st.moves).toEqual([...st.setup, ...Array.from({ length: st.repeat }, () => st.algorithm).flat()])
    expect(moves.length).toBeLessThan(400)
    total += moves.length
  }
  expect(total / states.length).toBeLessThan(200)
})
test('stages come in method order', () => {
  const order = ['hold','daisy','cross','corners','middle','yellowCross','yellowEdges','placeCorners','twistCorners','finish']
  const seen = solve(states[0]).steps.map((s) => order.indexOf(s.stage))
  expect(seen).toEqual([...seen].sort((a, b) => a - b))
})
test('a solved cube needs only the hold step', () => {
  expect(solve(SOLVED).steps.map((s) => s.stage)).toEqual(['hold'])
})
test.each([
  ['one flipped edge', swap(SOLVED, 7, 19)],
  ['one twisted corner', cycle(SOLVED, 8, 9, 20)],
  ['two swapped edges', swapEdges(SOLVED, [7, 19], [5, 10])],
  ['wrong length', SOLVED.slice(1)],
  ['bad colour count', 'U' + SOLVED.slice(1, 53) + 'U'],
  ['centre off home', swap(SOLVED, 4, 13)],
])('%s throws UnsolvableError', (_, s) => {
  expect(() => solve(s)).toThrow(UnsolvableError)
})
```

Write `swap`, `cycle` and `swapEdges` as small test helpers in the test file. `swapEdges` exchanges both stickers of two edges, keeping each edge's own orientation.

- [ ] **Step 2: Run**: Expected FAIL.
- [ ] **Step 3: Implement** the three stages and `solve`.
- [ ] **Step 4: Run**: `npx vitest run src/solver`. Expected: PASS, in under ~10 s on a laptop. If it's slower, profile before changing any algorithm.
- [ ] **Step 5: Commit**: `feat(solver): yellow corners and solve()`

---

### Task 8: Play the solve in the garden

**Files:**
- Create: `web/src/solver/progress.ts`, `web/src/solver/progress.test.ts`
- Modify:
  - `web/src/cube/usePlayer.ts` (+ test)
  - `web/src/ui/Overlay.tsx`, `web/src/ui/overlay.module.css`
  - `web/src/garden/GardenPage.tsx`

**Interfaces:**
- `stepAt(steps: Step[], moveIndex: number): { stepIndex: number; step: Step } | null`. This is the step that contains the next move to play (move `moveIndex`). It returns null when `moveIndex >= total moves` (finished). Negative indices are clamped to 0.
- Player action `{ type: 'reset' }`: index 0, progress 0, `playing` unchanged.
- Overlay props:
  - replace `stepTitle`, `stepAlgorithm` with `step: { title: string; algorithm: string; setup: string; why: string }`;
  - add `onNewScramble: () => void`.
  - The banner shows title, algorithm chip (hidden when empty; `×N` appended when repeat > 1), move counter, then a second line `First: <setup>` (hidden when empty) and the why text.
  - The bar gets a `New scramble` button.
- Copy:
  - title is `${stageName}: ${caseName}`;
  - finished title `Solved!`;
  - finished why `Every face is one colour again. Press New scramble to try another.`

- [ ] **Step 1: Failing tests**

```ts
// progress.test.ts
const { steps, moves } = solve(applyMoves(SOLVED, scramble(20, mulberry32(1))))
test('move 0 is in the first step; the last move is in the last step', () => {
  expect(stepAt(steps, 0)?.stepIndex).toBe(0)
  expect(stepAt(steps, moves.length - 1)?.stepIndex).toBe(steps.length - 1)
})
test('the first move of step k maps to step k', () => {
  let start = 0
  steps.forEach((st, k) => { expect(stepAt(steps, start)?.stepIndex).toBe(k); start += st.moves.length })
})
test('finished and out-of-range indices give null; negative clamps to 0', () => {
  expect(stepAt(steps, moves.length)).toBeNull()
  expect(stepAt(steps, moves.length + 5)).toBeNull()
  expect(stepAt(steps, -1)?.stepIndex).toBe(0)
})
// usePlayer.test.ts
test('reset goes back to move 0 and keeps playing state', () => {
  const s = playerReducer({ ...createPlayerState(false), index: 30, progress: 0.4 }, { type: 'reset' })
  expect(s).toMatchObject({ index: 0, progress: 0, playing: true })
})
```

(Use the reducer's real exported name from `usePlayer.ts`.)

- [ ] **Step 2: Run**: Expected FAIL.
- [ ] **Step 3: Implement**:
  - `stepAt` and the `reset` action.
  - Overlay changes, with the why line in a smaller font that still wraps at 390 px wide.
  - GardenPage keeps `scrambleMoves` in state (first value `scramble(20, mulberry32(SEED))`) and memoises `solve(applyMoves(SOLVED, scrambleMoves))`. It passes `startMoves={scrambleMoves}` and `moves={solution.moves}` (stable identities per scramble). New scramble sets `scramble(20)` and dispatches `reset`. If `solve` throws, log it and keep the previous solve (it shouldn't happen for generated scrambles).
- [ ] **Step 4: Verify**:
  - Run `npm test && npx tsc --noEmit && npx eslint src && npm run build`: all green.
  - Then in the browser at 1280×800 and 390×844: playback starts with the cube flipping (`z2`); the banner names the stage and case and shows the algorithm and why; the last move ends on a solved cube with `Solved!`; New scramble pressed mid-playback restarts at 0/N with the new scramble; Prev and Next still work; the phone banner doesn't overlap the controls.
- [ ] **Step 5: Commit**: `feat: play the beginner solve in the garden`
