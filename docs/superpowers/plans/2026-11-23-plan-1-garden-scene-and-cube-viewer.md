# Plan 1: Garden Scene and Cube Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js page that shows the approved swaying-flower garden with a floating glossy Rubik's cube that plays a move sequence, with play/pause and the garden hotspots (watering can, signpost, butterfly) showing placeholder messages.

**Architecture:** Next.js App Router app in `web/`. Pure TypeScript cube logic (`src/cube/`) and pure scene-layout logic (`src/garden/layout/`) are unit-tested with vitest. The 3D scene is react-three-fiber components that consume those pure modules; the Canvas is client-only. Wind is a shader patch on instanced materials, ported from the prototype.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, three (0.187), @react-three/fiber 9, @react-three/drei, vitest 5, Playwright (already available) for visual checks.

**Spec:** `docs/superpowers/specs/2026-11-22-rubiks-garden-design.md`. Visual and numeric reference: `docs/superpowers/prototypes/garden-prototype-v3.html` (plain three.js; port values and formulas, not structure).

## Global Constraints

- App lives in `web/` (the repo root folder name has spaces and is not a valid npm package name). All commands below run from `web/` unless stated.
- TypeScript strict. No `any` in `src/cube` or `src/garden/layout`.
- The R3F `<Canvas>` must never render on the server (load via `next/dynamic` with `ssr: false`).
- Cube facelet convention: 54-character string, face order U R F D L B, nine stickers per face, row-major, Kociemba layout. Solved = `UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB`.
- Move notation: faces `U D L R F B`, suffix `'` (reverse) or `2` (twice). Example `R U2 F'`.
- Quality tiers `high` and `low`. `high` counts (from the prototype): flowers daisy 650, spike 280, sunflower 45, puff 130; grass 24000; butterflies 7. `low`: flowers x0.4 (rounded), grass 6000, butterflies 4.
- Flower heights (units): daisy 0.8-1.9, spike 1.0-2.2, sunflower 1.7-2.5, puff 0.5-1.1. Flower palettes and grass HSL range as in the prototype after the "tone down" edit (soft pastels, grass saturation 0.55-0.75).
- Cube: stickers `[0xff1f2d,0xff6a00,0xfafafa,0xffe000,0x00c853,0x0a55ff]` for faces `[R, L, U, D, F, B]`; body radius 0.1 on a 0.97 cube; sticker corner radius 0.09.
- Camera starts at `(9, 2.0, 13)` targeting `(0, 3.2, 0)`; cube floats at y = 4.4 bobbing by 0.2.
- Respect `prefers-reduced-motion`: wind amplitude 0, cube starts paused, butterflies still.

## Review Focus

1. WebGL unavailable or context lost: page shows a plain message instead of a blank screen.
2. Tab hidden then shown: animation delta is clamped so the cube does not jump through many moves.
3. Empty move list and malformed move strings (`"X"`, `"R3"`, `""`): parser rejects bad tokens with a clear error, empty list plays nothing and shows solved.
4. Window resize and device-pixel-ratio changes keep the scene correctly proportioned.
5. Unmounting the scene (route change, hot reload) disposes geometries, materials and listeners; no leaked GPU memory or stuck animation loop.

---

### Task 1: Scaffold the Next.js app and test runner

**Files:**
- Create: `web/` (via create-next-app), `web/vitest.config.ts`, `web/src/cube/smoke.test.ts` (deleted in Task 2)
- Modify: `web/package.json` (scripts `test`, `test:watch`)

**Interfaces:**
- Produces: `npm test` runs vitest once; `npm run dev` serves on port 3000; path alias `@/` -> `web/src/`.

- [ ] **Step 1: Scaffold**

Run from repo root: `npx create-next-app@latest web --ts --app --src-dir --eslint --no-tailwind --import-alias "@/*" --use-npm`. Then in `web/`: `npm i three @react-three/fiber @react-three/drei` and `npm i -D vitest @types/three`.

- [ ] **Step 2: Configure vitest** in `web/vitest.config.ts` (node environment, alias `@` to `src`, include `src/**/*.test.ts`). Add scripts `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Write failing smoke test** `web/src/cube/smoke.test.ts`: `expect(1 + 1).toBe(2)` imported via the `@/` alias is not needed; assert only that vitest runs. Run `npm test`; Expected: 1 passed.

- [ ] **Step 4: Verify build**

Run `npm run build`; Expected: build succeeds. Run `npm run dev`, open `http://localhost:3000`; Expected: default Next page.

- [ ] **Step 5: Commit** (inside `web/` repo state is the user's choice; if the repo root is not a git repo, run `git init` at the repo root first, noting that the parent folder `~` is currently a git repo, so a nested `git init` is recommended): `git add . && git commit -m "chore: scaffold next app with vitest"`.

---

### Task 2: Move parsing

**Files:**
- Create: `web/src/cube/moves.ts`
- Test: `web/src/cube/moves.test.ts`
- Delete: `web/src/cube/smoke.test.ts`

**Interfaces:**
- Produces:
  - `type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B'`
  - `type Move = { face: Face; turns: 1 | 2 | 3 }` (3 = counter-clockwise quarter)
  - `parseMoves(text: string): Move[]` (whitespace separated; throws `Error` naming the bad token)
  - `formatMove(m: Move): string`, `invertMove(m: Move): Move`, `invertMoves(ms: Move[]): Move[]` (reversed order, each inverted)

- [ ] **Step 1: Write failing tests** in `moves.test.ts`: `parseMoves("R U2 F'")` equals `[{face:'R',turns:1},{face:'U',turns:2},{face:'F',turns:3}]`; `formatMove` round-trips each; `parseMoves("")` returns `[]`; `parseMoves("R3")` and `parseMoves("X")` throw with the token in the message; `invertMoves(parseMoves("R U2 F'")).map(formatMove).join(" ")` equals `"F U2 R'"`.
- [ ] **Step 2: Run** `npx vitest run src/cube/moves.test.ts`; Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the functions above in `moves.ts`.
- [ ] **Step 4: Run** the same command; Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "feat: move parsing"`.

---

### Task 3: Cube state and move application

**Files:**
- Create: `web/src/cube/state.ts`
- Test: `web/src/cube/state.test.ts`

**Interfaces:**
- Consumes: `Move`, `Face` from `moves.ts`.
- Produces:
  - `const SOLVED: string` (54 chars, convention in Global Constraints)
  - `applyMove(state: string, m: Move): string`, `applyMoves(state: string, ms: Move[]): string`
  - `isSolved(state: string): boolean`
  - `scramble(length: number, rng?: () => number): Move[]` (no two consecutive moves on the same face; default `Math.random`)

- [ ] **Step 1: Write failing tests** in `state.test.ts`:
  - `applyMove(SOLVED, {face:'R',turns:1})` equals `"UUFUUFUUFRRRRRRRRRFFDFFDFFDDDBDDBDDBLLLLLLLLLUBBUBBUBB"`.
  - For each face, applying the move 4 times returns `SOLVED`; applying `turns:1` then `turns:3` returns `SOLVED`; `turns:2` equals two `turns:1`.
  - `applyMoves(SOLVED, parseMoves("R U R' U'"))` repeated 6 times returns `SOLVED` (order 6).
  - `isSolved(SOLVED)` true; after one `R` false.
  - `scramble(20, seededRng)` has length 20, never the same face twice in a row, and is deterministic for a fixed rng; `scramble(0)` returns `[]`.
- [ ] **Step 2: Run** `npx vitest run src/cube/state.test.ts`; Expected: FAIL.
- [ ] **Step 3: Implement** with one 54-entry permutation table per face (clockwise quarter turn), derived once from the Kociemba facelet layout; `turns` applies the table 1-3 times.
- [ ] **Step 4: Run**; Expected: PASS, including the known R-move string.
- [ ] **Step 5: Commit** `git commit -am "feat: cube state and moves"`.

---

### Task 4: Animation mapping for moves

**Files:**
- Create: `web/src/cube/layers.ts`
- Test: `web/src/cube/layers.test.ts`

**Interfaces:**
- Consumes: `Move`.
- Produces:
  - `type Axis = 'x' | 'y' | 'z'`
  - `type LayerTurn = { axis: Axis; layer: -1 | 1; quarterTurns: number }` (radians = `quarterTurns * Math.PI / 2`)
  - `layerTurn(m: Move): LayerTurn`
  - `cubieInLayer(pos: [number, number, number], t: LayerTurn): boolean` (pos components are integers -1..1)

- [ ] **Step 1: Write failing tests**: with `turns:1` clockwise viewed from outside the face: `R -> {x, 1, -1}`, `L -> {x, -1, +1}`, `U -> {y, 1, -1}`, `D -> {y, -1, +1}`, `F -> {z, 1, -1}`, `B -> {z, -1, +1}`; `turns:3` negates, `turns:2` doubles magnitude (`R2 -> -2`). `cubieInLayer([1,0,-1], layerTurn(R))` true, `[0,0,0]` false; exactly 9 of the 27 positions match any layer.
- [ ] **Step 2: Run**; Expected: FAIL. **Step 3: Implement.** **Step 4: Run**; Expected: PASS. **Step 5: Commit** `git commit -am "feat: layer turn mapping"`.

---

### Task 5: Quality tier and layout generation (pure)

**Files:**
- Create: `web/src/garden/quality.ts`, `web/src/garden/layout/random.ts`, `web/src/garden/layout/flowers.ts`
- Test: `web/src/garden/quality.test.ts`, `web/src/garden/layout/flowers.test.ts`

**Interfaces:**
- Produces:
  - `type Tier = 'high' | 'low'`; `interface QualityCounts { grass: number; butterflies: number; flowers: Record<FlowerKind, number> }`; `countsFor(tier: Tier): QualityCounts`; `detectTier(env: { hardwareConcurrency?: number; deviceMemory?: number; isMobile: boolean }): Tier` (`low` when mobile with <=4 cores or memory <=4, else `high`)
  - `mulberry32(seed: number): () => number` in `random.ts`
  - `type FlowerKind = 'daisy' | 'spike' | 'sunflower' | 'puff'`
  - `interface FlowerInstance { kind: FlowerKind; x: number; z: number; height: number; scale: number; tiltX: number; tiltZ: number; yaw: number; colorIndex: number }`
  - `generateFlowers(counts: Record<FlowerKind, number>, seed: number): FlowerInstance[]`
  - `FLOWER_SPECS: Record<FlowerKind, { height: [number, number]; scale: [number, number]; palette: number[] }>` with the Global Constraints heights and the toned-down palettes from the prototype.

- [ ] **Step 1: Write failing tests**: `countsFor('high')` equals the Global Constraints numbers; `countsFor('low')` flowers are `round(0.4 x)` and grass 6000, butterflies 4; `detectTier({isMobile:true,hardwareConcurrency:4,...})` is `low`, desktop 8 cores `high`. `generateFlowers` returns exactly the requested count per kind; every `height` is within its spec range; every point has `hypot(x,z) <= 27`; same seed gives identical output, different seed differs; `colorIndex` always `< palette.length`.
- [ ] **Step 2: Run** `npx vitest run src/garden`; Expected: FAIL. **Step 3: Implement** (patch-based colour choice as in the prototype: 78% by smooth noise of position, 22% random). **Step 4: Run**; Expected: PASS. **Step 5: Commit** `git commit -am "feat: quality tiers and flower layout"`.

---

### Task 6: Butterfly flight paths (pure)

**Files:**
- Create: `web/src/garden/layout/butterflies.ts`
- Test: `web/src/garden/layout/butterflies.test.ts`

**Interfaces:**
- Produces:
  - `interface FlightParams { cx; cz; rx; rz; w; ph; h; ha; flap: number; kind: 'monarch'|'admiral'|'swallow'|'blue'; scale: number; isHint: boolean }`
  - `generateButterflies(count: number, seed: number): FlightParams[]` (index 0 is the hint butterfly, scale 1.9)
  - `butterflyPosition(p: FlightParams, t: number): [number, number, number]`
  - `butterflyHeading(p: FlightParams, t: number): number` (yaw so the butterfly faces its motion, from the finite difference used in the prototype)

- [ ] **Step 1: Write failing tests**: count respected and exactly one `isHint`; heights stay between 0.3 and 6.5 for t in 0..200; position is continuous (distance between t and t+0.05 under 1 unit); heading is finite everywhere; deterministic per seed.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement** from the prototype's `P()` function. **Step 4: Run**; PASS. **Step 5: Commit** `git commit -am "feat: butterfly flight paths"`.

---

### Task 7: Meadow (instanced grass and flowers with wind)

**Files:**
- Create: `web/src/garden/wind.ts`, `web/src/garden/Meadow.tsx`, `web/src/garden/flowerGeometry.ts`
- Test: `web/src/garden/wind.test.ts`

**Interfaces:**
- Consumes: `generateFlowers`, `FLOWER_SPECS`, `countsFor`, `mulberry32`.
- Produces:
  - `windOffset(x: number, z: number, height: number, t: number, amp: number): [number, number]` (JS twin of the shader math, used for tests and non-instanced objects)
  - `applyWind(material: THREE.Material, amp: number, uniforms: { uTime: { value: number }; uStrength: { value: number } }): void` (patches `onBeforeCompile`, same formula as the prototype, scaled by `uStrength` so reduced-motion sets 0)
  - `buildFlowerGeometry(kind: FlowerKind): { head: THREE.BufferGeometry; mid: THREE.BufferGeometry | null }`
  - `<Meadow tier={Tier} seed={number} windStrength={number} />`

- [ ] **Step 1: Write failing tests** for `windOffset`: zero height returns `[0,0]`; offset grows with height (taller moves more); `amp 0` returns `[0,0]`; deterministic; magnitude at height 2, amp 0.1 stays under 1.0 for all t in 0..100.
- [ ] **Step 2: Run** `npx vitest run src/garden/wind.test.ts`; FAIL. **Step 3: Implement** `wind.ts` and `applyWind` (vertex chunk replacement as in the prototype, using `uStrength`).
- [ ] **Step 4: Implement `Meadow.tsx`**: grass `InstancedMesh` (tapered blade, vertex-colour gradient, per-instance HSL colour), then one stem + head (+ centre for daisy and sunflower) `InstancedMesh` per `FlowerKind`; update `uTime` in `useFrame`; dispose geometries and materials on unmount.
- [ ] **Step 5: Verify visually** in Task 10 page; here run `npm run build` and `npx tsc --noEmit`; Expected: no errors. **Step 6: Commit** `git commit -am "feat: meadow with wind"`.

---

### Task 8: Sky, ground, clouds, trees, lighting

**Files:**
- Create: `web/src/garden/Environment.tsx`, `web/src/garden/Sky.tsx`, `web/src/garden/Clouds.tsx`, `web/src/garden/Trees.tsx`

**Interfaces:**
- Produces: `<Environment />` that renders lights (hemisphere 0.85, directional sun 1.3 with 2048 shadow map covering +-10), the gradient sky sphere with sun glow, the ground disc and distant hills, the clouds (drifting, wrap at x=110), and the 9 trees from the prototype positions. Renderer settings are applied in Task 10: sRGB output, `NoToneMapping`, fog from `0xd4ecff` at 30..80.

- [ ] **Step 1: Implement** the four components by porting the prototype sections "sky", "ground + hills", "trees", "clouds" and lights; colours use `THREE.Color` with sRGB conversion consistent with the prototype.
- [ ] **Step 2: Verify** `npx tsc --noEmit` passes; visual check deferred to Task 10.
- [ ] **Step 3: Commit** `git commit -am "feat: sky, ground, clouds, trees"`.

---

### Task 9: Cube viewer with animated moves

**Files:**
- Create: `web/src/cube/CubeViewer.tsx`, `web/src/cube/cubeGeometry.ts`, `web/src/cube/usePlayer.ts`
- Test: `web/src/cube/usePlayer.test.ts` (reducer logic only, pure)

**Interfaces:**
- Consumes: `Move`, `layerTurn`, `cubieInLayer`, `parseMoves`.
- Produces:
  - `roundedBoxGeometry(size: number, radius: number, segments: number): THREE.BufferGeometry` (port of prototype `roundedBox`)
  - `stickerGeometry(): THREE.ExtrudeGeometry` (corner radius 0.09)
  - Pure player model: `interface PlayerState { index: number; progress: number; playing: boolean; speed: number }`, `playerReducer(state, action)` with actions `play`, `pause`, `next`, `prev`, `setSpeed(n)`, `tick(dt: number, moveCount: number)`. `tick` clamps `dt` to 0.05, advances `progress` by `dt * speed / 0.55`, rolls to `index + 1` at progress 1, and pauses at `index === moveCount`.
  - `<CubeViewer moves={Move[]} startPaused={boolean} onStep={(index: number) => void} />` and `usePlayer(moveCount: number, startPaused: boolean)` returning `[PlayerState, dispatch]`.

- [ ] **Step 1: Write failing tests** for `playerReducer`: `tick` with dt 10 advances less than one move (clamp); reaching `moveCount` sets `playing:false`; `next` at the end stays put; `prev` at 0 stays 0; `tick` with `moveCount 0` leaves `index 0` and `playing:false`; `setSpeed(2)` doubles progress per tick.
- [ ] **Step 2: Run** `npx vitest run src/cube/usePlayer.test.ts`; FAIL. **Step 3: Implement** the reducer and `usePlayer`.
- [ ] **Step 4: Implement `CubeViewer.tsx`**: 27 cubies (rounded body + 6 sticker meshes per exposed face) with glossy physical materials (roughness 0.18, clearcoat 1, no environment map: it washed the cube out in the prototype), eased layer rotation (easeInOutQuad) applied via a pivot group and baked back on completion, bobbing as in Global Constraints, shadows on. Dispose on unmount.
- [ ] **Step 5: Run** `npm test` and `npx tsc --noEmit`; Expected: all pass. **Step 6: Commit** `git commit -am "feat: cube viewer and player"`.

---

### Task 10: Butterflies, props, hotspots, UI overlay, page assembly

**Files:**
- Create: `web/src/garden/Butterflies.tsx`, `web/src/garden/Props.tsx`, `web/src/garden/Hotspots.tsx`, `web/src/garden/GardenScene.tsx`, `web/src/ui/Pill.tsx`, `web/src/ui/Overlay.tsx`, `web/src/ui/Toast.tsx`, `web/src/ui/overlay.module.css`
- Modify: `web/src/app/page.tsx`, `web/src/app/layout.tsx` (title, remove default styles)
- Test: `web/src/garden/hotspots.test.ts` (message table)

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `HOTSPOT_MESSAGES: Record<'can'|'sign'|'butterfly'|'cube', string>` in `src/garden/hotspots.ts` with the prototype strings
  - `<GardenScene />` (client component; Canvas, OrbitControls with target `(0,3.2,0)`, `maxPolarAngle = Math.PI*0.5`, `minDistance 4`, `maxDistance 22`, shadows, sRGB, no tone mapping, fog; chooses tier via `detectTier`; reads `prefers-reduced-motion`)
  - Page `/` renders `GardenScene` through `next/dynamic` with `ssr: false` and a WebGL-support fallback message
  - Overlay pills: step banner ("Yellow cross: L-shape" + `F R U R' U' F'` as a static placeholder), hint bar, play/pause, mute button (no-op), "Simple view" button (no-op), toast for hotspot clicks (auto-hides after 2.6 s); the demo move list is `scramble(20, mulberry32(1))` inverted so the cube visibly returns to solved

- [ ] **Step 1: Write failing test** `hotspots.test.ts`: the four keys exist and each message is non-empty.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement** `hotspots.ts`.
- [ ] **Step 4: Implement** butterflies (painted canvas wing textures for the four kinds, flapping wings, `butterflyPosition`/`butterflyHeading`), props (watering can, signpost), hotspot click handling that ignores drags (movement threshold 5 px), the overlay, and the page.
- [ ] **Step 5: Verify in the browser**: run `npm run dev`; with Playwright open `http://localhost:3000`, wait 5 s, screenshot. Expected: sky and clouds, soft-coloured meadow swaying, cube floating and turning, pills visible, no console errors. Click the watering can; Expected: toast "Watering can: start scanning your cube (camera opens here)". Toggle OS reduced motion; Expected: no sway, cube paused.
- [ ] **Step 6: Verify the Review Focus items**: disable WebGL in the browser launch flags and confirm the fallback message; navigate away and back, confirm no console warnings about leaked contexts; resize the window and confirm the aspect ratio updates.
- [ ] **Step 7: Run** `npm test && npm run build && npm run lint`; Expected: all pass.
- [ ] **Step 8: Commit** `git commit -am "feat: garden page with cube, butterflies and hotspots"`.

---

## Self-Review Notes

- Spec coverage for plan 1: garden look (Tasks 5-8, 10), cube viewer with playback (Tasks 2-4, 9), hotspots as placeholders (Task 10), quality tier and reduced motion (Tasks 5, 7, 10). Scanner, solver, auth, sound, Guide me, Simple view are later plans by design.
- Types checked across tasks: `Move`, `Face`, `LayerTurn`, `FlowerKind`, `FlowerInstance`, `FlightParams`, `Tier`, `PlayerState` are each defined once and consumed under the same names.
- Review Focus coverage: WebGL fallback (Task 10 step 6), clamped delta (Task 9 tests), empty/malformed moves (Tasks 2 and 9 tests), resize (Task 10 step 6), disposal (Tasks 7 and 9 implementation notes, Task 10 step 6).
