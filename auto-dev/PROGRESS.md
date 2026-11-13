# Bridge auto-dev progress

Spec: `KAI-HOUSE-ANALYSIS.md` (phases are section 13.3).

## Placeholder room (until real GLBs exist)
Build the room procedurally in code behind the same interfaces the GLB loader will use, so swapping in real models later is a data change:
- Shell about 9.4 x 9.4 x 5.7 units, floor at y = 0.32, walls on the -x and -z sides.
- Simple box stand-ins for desk, CRT, sofa, table, laptop, TV, door, chair, roomba, each as its own named group matching the model names in section 3.1.
- Flat quads named `screenCRT`, `screenTV`, `screenMacbook`, `screenWhiteboard` at roughly the bounds in section 3.1.
- Clay material + the two fallback lights from section 4.6.

## Steps
- [x] 0. Create branch `auto-dev`; add `.gitignore` (node_modules, dist, .astro, .next, .mcp.json, auto-dev/log.txt, auto-dev/.lock); `npm install three normalize-wheel @types/three`; commit the existing files.
- [x] 1. Shell: gradient page, transparent renderer, camera with the fov rule, Time/Sizes/EventEmitter, Experience singleton, placeholder room.
- [x] 2. Navigation: orbit, pan, zoom, limits, smoothing, double-click/double-tap reset, touch.
- [ ] 3. Resources/Loader with Draco + baked-material path, falling back to the placeholder room when `public/assets/*.glb` are absent. Loading bar.
- [ ] 4. Ambient life: chair swivel, roomba on a path JSON (write an original path for the placeholder room), steam shader.
- [ ] 5. Screens: whiteboard canvas, one scripted canvas screen, video screen (use a generated canvas pattern if no video file exists).
- [ ] 6. Interactions: hull hover, click-vs-drag, priority chain, event bus.
- [ ] 7. CRT mode: BIOS boot canvas, camera push, lights-out, navigation to `/portfolio`, and `#powerdown` arrival. Create a minimal `/portfolio` page with a "Home" link back.
- [ ] 8. TV mode (composer, bokeh, background swap) and laptop mode with its panel.
- [ ] 9. HTML labels, room-rect placement, luma probe, role rotation, settings + sound buttons.
- [ ] 10. Audio graph: synthesized roomba, mute, duck, tab-away suspend. Skip sample files that do not exist.
- [ ] 12. Polish: reduced motion, no-WebGL fallback, context loss, dispose, meta/OG tags.

## Blocked on user (do not attempt)
- Real room models and baked textures (needs Blender).
- Phase 11, the full destination app: needs the user's decision on what is inside the computer.
- Real content: projects, videos, label copy, roles. Use obvious placeholder text.

## Decisions made on the user's behalf
- Step 0: `kai-house-reference/` is gitignored rather than committed. It holds captures from kai.house (screenshots, a baked atlas, their roomba path), which are not ours to put in the repo history. The files stay on disk as visual reference only; nothing in `src/` or `public/` may import or copy them. Remove the ignore line if you want them tracked.
- Step 0: also ignored `.DS_Store`.
- Step 0: `npm install` reported 8 audit vulnerabilities in the existing dependency tree (1 critical). Not touched, since `npm audit fix` can change versions; worth a manual look.
- Step 1: finished a half-done earlier run (its `assets.ts`, `Camera.ts`, `Renderer.ts`, `utils/*` were on disk uncommitted and were kept as they were). Committed the `tsconfig.json` and the `auto-dev/devserver.log` ignore line that were also sitting uncommitted.
- Step 1: added `src/room/world/World.ts` now (the plan lists it under 13.1) so the clay material and fallback lights live where the baked path will go. Lights use the exact section 4.6 values.
- Step 1: placeholder layout numbers (desk top y 2.3, table top y 1.17, sofa seat y 1.3, door hinge at x -2.11 on the -z wall opening toward +x, laptop screen facing +z toward the sofa) are my own guesses at the section 3.1 scale. Pivots that matter (door hinge, chair swivel axis, roomba centre) are real; the door pivot sits at floor height rather than the spec's y 4.44. `screenCRT` is a flat quad, not curved.
- Step 1: page skeleton uses the section 10 class names (`.page > .stage > .room-experience > #room.room-experience__target`); viewport is locked (`maximum-scale=1, user-scalable=no`) as in section 4.4.
- Step 1: NOT checked in a browser (no dev server allowed in these runs). Only `npm run build` (astro check + build, 0 errors) was verified. Have a look at `/` and say if the room is framed or lit badly.
- Build prints a Vite warning that the JS chunk is over 500 kB (three.js). Left alone; revisit in step 12.

- Step 2: `src/room/Navigation.ts` uses pointer events (one code path for mouse, pen and touch, with pointer capture so a drag keeps working outside the canvas) instead of separate mouse/touch handlers. Constants are the section 4.4 values unchanged.
- Step 2: two-finger gesture pans by the midpoint movement and pinches at the same time. Mouse pan = middle/right button, or alt/ctrl/shift + left drag. Pan direction is "the room follows the pointer".
- Step 2: only `touchmove` is `preventDefault`ed (not `touchstart`), so taps still produce clicks for step 6. `contextmenu` is prevented on `window` while the room page is open. `wheel` is always prevented on `#room` (stops ctrl+wheel page zoom).
- Step 2: the zoom event keeps the spec name `kai:zoom` (exported as `ZOOM_EVENT` in `Navigation.ts`, one line to rename). While `navigation.suspended` is true input is ignored but the smoothing still runs; `restoreState(state, immediate = true)` snaps both value and smoothed.
- Step 2: NOT checked in a browser. Only `npm run build` (0 errors). Drag feel, pan direction and pinch speed need a human try.
- Step 2: no grab/grabbing cursor yet; step 6 owns the cursor (pointer on hover).

## Next step
Step 3. Read sections 4.5, 4.6 and 3.1-3.3 of `KAI-HOUSE-ANALYSIS.md`. Create `src/room/Resources.ts` + `src/room/Loader.ts` (extend `utils/EventEmitter`): groups of sources from `assets.ts`, GLTFLoader with DRACOLoader (decoder copied from `node_modules/three/examples/jsm/libs/draco/` into `public/draco/`, never from a CDN) and TextureLoader, emitting `progress` and `groupEnd`. Before loading, probe whether the base GLBs exist under `public/assets/` (a HEAD/fetch that 404s, or better a build-time `import.meta.glob`/manifest so there are no console 404s); if absent, emit `groupEnd` for `base` straight away with the placeholder room from `createPlaceholderRoom()`. Change `Experience.ts` so `World` is built on `groupEnd` for group `base` (currently built synchronously in the constructor; `world.update()`/`destroy()` must tolerate it not existing yet). Add the baked-material path in `World.ts` (section 4.6) used only when real textures are present, clay + fallback lights otherwise. Add the loading bar HTML/CSS from section 10 "Loading" to `src/pages/index.astro`, driven by `progress`, hidden on `groupEnd`. Baseline: `npm run build` passes (1 page, 0 errors); navigation lives in `src/room/Navigation.ts` and is updated last in `Experience.update()`.
