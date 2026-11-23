# Rubik's Garden: Design

Status: scene look approved by the user on 2026-11-22 (via prototype). Remaining subsystems still to be specified in detail.

## Intent

A public web app that teaches people to solve a 3x3 Rubik's cube. The user scans a physical cube with a camera, the app stores the colour state in the cloud, then solves it in an animated 3D view, step by step, naming the beginner-method stage, the case the cube is in, and the standard algorithm used, with a short "why". The whole app is one bright, playful 3D garden scene; objects in the garden are the controls.

## Goals

- Scan a real 3x3 cube with a phone or laptop camera, guided face by face, with manual colour correction.
- Solve with a beginner layer-by-layer method and explain each step (stage, case, algorithm, why).
- Two modes: Watch it (animated playback with full controls) and Guide me (app watches the real cube through the camera and confirms each move the user makes).
- Accounts (email + Google) and cloud storage of colour data and solves, on GCP (Firebase Auth + Firestore, Firebase Hosting).
- Feels like a place: a swaying flower meadow, butterflies, soft sound.

## Non-goals

- Cube sizes other than 3x3x3. CFOP. Multiplayer or sharing. Offline use. Storing camera photos. Day/night or growth-progress effects.

## Anti-goals

- A garden so busy or colourful that the cube and the lesson get lost.
- A scene that is unusable on a mid-range phone or without a mouse (a flat "Simple view" must exist).
- Shipping a solver whose steps cannot be named as human techniques.

## Decisions made by the user

- Web app; guided 6-face scan; 3x3 only; beginner layer-by-layer with named cases and algorithms; "what + why" explanations.
- Playback: play/pause, next/previous step, speed, drag to rotate; step name and notation shown.
- Cloud accounts on GCP; email + Google sign-in; colour data only; manual colour editor; random scramble practice mode; letter labels (W/Y/R/O/G/B) on stickers in edit screens; invalid scans highlight likely errors.
- Public audience; online only; phone and laptop equally; build in layers.
- Scene: bright low-poly-in-spirit 3D garden (reference: 3dgarden.app Cozy Isle, reference photos of wildflower meadows). Cube floats above the flowers, glossy plastic with slightly rounded edges. Tall-stemmed flowers swaying in rolling wind gusts, toned-down pastel colours, sparse butterflies, big sky with clouds, camera low among the flowers.
- Garden controls: camera on a tripod = scan (replaced the watering can, user request 2026-11-23), signpost = technique guide + My solves, butterfly = hint. Sound: soft ambience (birds, breeze) + cube move clicks, with mute.
- Frontend: Next.js (App Router) with React and react-three-fiber (user asked for "proper React Next.js code").

## Decisions made by the builder (not yet confirmed)

- TypeScript, three.js via @react-three/fiber and @react-three/drei, vitest for tests.
- Colour detection client-side using each face's centre sticker as reference.
- Own layer-by-layer solver (not Kociemba).
- Lighter garden tier on low-end devices; flat "Simple view" for accessibility.
- Saved solves live on the signpost's second tab.

## Reference prototype

`docs/superpowers/prototypes/garden-prototype-v3.html` is the approved look, in plain three.js. It is a visual and numeric reference (counts, heights, palettes, wind formula, colours), not code to ship.

## Subsystems and plan order

1. Garden scene + 3D cube viewer in Next.js (plan 1)
2. Beginner solver with case detection and explanations
3. Camera scanner, colour classification, manual editor, validity checks
4. Auth + Firestore persistence + signpost (guide, history)
5. Sound
6. Guide me (live move detection): spike feasibility first
7. Simple view + low-end tier hardening, deploy

## Open questions

- App name. GCP project to use. Whether Guide me ships in v1 or later.
