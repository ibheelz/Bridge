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
- [ ] 1. Shell: gradient page, transparent renderer, camera with the fov rule, Time/Sizes/EventEmitter, Experience singleton, placeholder room.
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

## Next step
Step 1. Read sections 13.1 (layout), 4 (renderer/camera/lights constants) and 3.1 (model names, screen bounds) of `KAI-HOUSE-ANALYSIS.md`, then create under `src/room/`: `utils/EventEmitter.ts`, `utils/Sizes.ts`, `utils/Time.ts`, `Camera.ts` (fov rule), `Renderer.ts` (transparent, alpha), `world/PlaceholderRoom.ts` (see "Placeholder room" above), `Experience.ts` (singleton wiring them together). Replace the body of `src/pages/index.astro` with the gradient background plus a full-viewport canvas and a `<script>` that boots `Experience`. Baseline before step 1: `npm run build` passes (1 page, 0 errors). `three`, `normalize-wheel`, `@types/three` and `gsap` are installed. `src/pages/projects/` is an empty leftover folder; ignore it.
