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
- [ ] 2. Navigation: orbit, pan, zoom, limits, smoothing, double-click/double-tap reset, touch.
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

## Next step
Step 2. Read section 4.4 of `KAI-HOUSE-ANALYSIS.md` and create `src/room/Navigation.ts`: spherical (radius 43, phi 0.35pi, theta 0.25pi) + target (0,2,0) with `value`/`smoothed` pairs, smoothing 0.005 * deltaMs, the limits, drag orbit, alt-drag/2-finger pan, wheel via `normalize-wheel` (may need a small `declare module` d.ts), pinch, double-click/double-tap reset, `contextmenu` prevented, `kai:zoom` hysteresis event, `captureState()`/`restoreState()`, `suspended` flag. It drives `camera.modes.default.instance` (see `Camera.ts`; `HOME_VIEW` there holds the home constants, and `Camera.locked` is what cinematic modes will set). Wire it into `Experience.ts` after `world.update()` in the frame order, and call its `destroy()`. Listen on the target element (`#room`), which already has `touch-action: none` via `.page`. Baseline: `npm run build` passes (1 page, 0 errors).
