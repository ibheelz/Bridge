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
- [x] 3. Resources/Loader with Draco + baked-material path, falling back to the placeholder room when `public/assets/*.glb` are absent. Loading bar.
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

- Step 3: `Loader.ts` and `Resources.ts` live in `src/room/utils/` and the bar logic in `src/ui/loading.ts`, following the section 13.1 layout (the previous note said `src/room/`).
- Step 3: asset detection is done at build time. The frontmatter of `src/pages/index.astro` lists `public/assets/*.{glb,gltf,jpg,jpeg,png,webp}` and passes the URLs to the client in `data-assets` on `#room`, so there are no 404 probes. Each URL gets `?v=<file mtime>` as a cache-bust. Adding or replacing files needs a rebuild.
- Step 3: the real room is used only when ALL 11 model GLBs plus `screens.glb` are in `public/assets/` (names in `MODEL_NAMES` in `src/room/assets.ts`). With a partial set nothing is downloaded, a console warning names the missing files, and the placeholder room is shown. If a required file fails to download, or `screens.glb` lacks one of the four screen meshes, it also falls back to the placeholder. `coffeeSteam.glb` is optional and already loaded when present (key `coffeeSteam`), for step 4.
- Step 3: baked textures are optional per model: `baked-<model>.jpg` (png/webp also accepted). A model without one gets clay, and the fallback lights are added as soon as one model needs them. So GLBs can be dropped in before any baking is done.
- Step 3: loaded screen meshes get a flat dark material (`#15161a`) until step 5; `hoverDeskTop` is ignored.
- Step 3: GLTFLoader and DRACOLoader are dynamically imported, so the placeholder path never downloads them. Textures use `THREE.TextureLoader` rather than a hand-wrapped `Image`. No `drc`/`hdr` loaders (nothing uses them).
- Step 3: Draco decoder files are copied from `node_modules/three/examples/jsm/libs/draco/gltf/` into `public/draco/` and committed (about 750 kB). Re-copy them when upgrading three. The wasm decoder is used where available; the JS decoder is not forced as in the reference. Note: three 0.187's DRACOLoader also bundles its own decoder copies, which Vite emits into `dist/_astro/` (never downloaded, since `setDecoderPath` points at `/draco/`). Dropping `public/draco/` and the `setDecoderPath` call would also work; kept the explicit path as the better-known route.
- Step 3: the loading bar is only rendered when `roomModel.glb` exists, so the placeholder room shows no bar at all. Colours are ink (`#2d2b28` fill, 15% ink track, `#6b6760` percentage) instead of the spec's near-white, as section 10 itself recommends.
- Step 3: `experience.world` is now `World | null` (null until the `base` group ends, which is a microtask after construction for the placeholder). Later steps that touch `world` from `Experience` must allow for that, or be created inside `buildWorld()`.
- Step 3: NOT checked in a browser, and the GLB path has never run against a real file (there are none). Only `npm run build` (0 errors, 0 warnings). First thing to check once real GLBs exist: the room appears, the bar fills and fades, and the console is clean.

## Next step
Step 4. Read section 5 of `KAI-HOUSE-ANALYSIS.md` (animated objects) and section 3.3 for the path JSON shape. Add `src/room/world/ChairTop.ts` (swivel), `Roomba.ts` (follows a path) and `CoffeeSteam.ts` (shader), each taking what it needs from `World` (`world.models.chairTop`, `world.models.roomba`; the pivot is the single child node of each model group) and ticked from `World.update()`, which needs `Time` passed in (World currently receives only `scene` and a `RoomSource`; construct it in `Experience.buildWorld()`). Write an ORIGINAL roomba path for the placeholder room as `public/assets/roomba-path.json` in the `{ origin, points }` shape (do not copy the one in `kai-house-reference/`); keep it clear of the placeholder furniture in `PlaceholderRoom.ts` and at y = `FLOOR_Y`. Note the build-time asset list in `index.astro` only picks up glb/gltf/images, so the JSON is ignored by it; import the path or fetch it separately. For steam: use `resources.items.coffeeSteam` if it loaded, else a generated subdivided plane (0.28 x 0.5) above the placeholder mug. Baseline: `npm run build` passes (1 page, 0 errors); resources live in `src/room/utils/`, the room is built in `Experience.buildWorld()` on `groupEnd` of group `base`.
