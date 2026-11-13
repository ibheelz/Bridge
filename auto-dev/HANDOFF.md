# Bridge: instructions to finish the build

You are finishing a 3D-room portfolio site. Eight of eleven build steps are done. This file tells you exactly what is left and how to do it. Follow it top to bottom.

## 1. Read these first, in this order

1. This file, all of it.
2. `auto-dev/PROGRESS.md`. It lists every step, every decision already made, and the things nobody has yet checked in a browser.
3. Only the parts of `KAI-HOUSE-ANALYSIS.md` named in the step you are about to do. It is a 589-line spec; do not read it whole. Section 9 is audio, section 10 is the HTML layer, section 11 is the event list.

Do not re-research the reference site. Everything needed is in the spec.

## 2. Where things stand

- Project folder: `~/Desktop/web-apps/Bridge`. Astro 5 static site plus plain Three.js (0.187) in TypeScript. No Vue, no React.
- Git branch: `auto-dev`. Steps 0 to 7 are committed and pushed to `origin/auto-dev`.
- **Step 8 is finished and builds, but is NOT committed.** Your first action is in section 4.
- The room is a placeholder made of clay-coloured boxes (`src/room/world/PlaceholderRoom.ts`). Real models do not exist yet. Keep the placeholder.
- A preview server may already be running at http://localhost:4321/ (`npx astro dev --port 4321`). If it is not, the user can start it. Do not start long-running processes yourself in an unattended run.
- The unattended loop is stopped (`auto-dev/STOP` exists). Leave it stopped unless the user asks to restart it.

### Code map

```
src/pages/index.astro        page markup, all CSS, boot script (bottom of file)
src/pages/portfolio.astro    minimal destination page with a Home link
src/ui/loading.ts            loading bar
src/ui/suite.ts              laptop panel (use as the pattern for new ui files)
src/room/Experience.ts       singleton; owns the scene, frame loop, world, modes
src/room/events.ts           EVENTS names, detail types, emit()
src/room/Camera.ts           camera.instance (PerspectiveCamera), HOME_VIEW, fovForAspect
src/room/Navigation.ts       orbit, pan, zoom; captureState / restoreState / reset
src/room/Renderer.ts         renderer.instance (WebGLRenderer), setPost()
src/room/utils/              Time (emits 'tick'), Sizes (emits 'resize'), Resources, Loader, EventEmitter, screenGeo
src/room/world/World.ts      models, screens, roomba, door, liveScreens, setDim()
src/room/world/Roomba.ts     has `motor` (0 to 1) for the audio step
src/room/world/Interactions.ts  hover and click on door, macbook, tv, computer
src/room/modes/              CRTMode, FlyMode (base), SuiteMode, TVMode
```

Useful facts:
- `window.experience` is the singleton. `experience.world`, `interactions`, `crtMode`, `suiteMode`, `tvMode` are `null` until the room is built, shortly after page load. Always allow for `null`.
- `experience.modeActive` is true while any camera mode is running.
- Frame loop: `experience.time.on('tick', fn)`. Resize: `experience.sizes.on('resize', fn)`.
- All cross-module messages are `window` CustomEvents. Names live in `EVENTS` in `src/room/events.ts`. Add new names there, never as loose strings.
- Events that already fire: `kai:hover {id:'computer', hovered}`, `kai:crtmode {phase}` (phase `'idle'` means not running), `kai:tvmode {active}`, `kai:suite {active}`, `kai:zoom {zoomedIn}`.

## 3. Rules that apply to every step

- Work on branch `auto-dev` only. Never touch `main`. Do not push unless the user asks.
- Stay inside the project folder. Never read, print or edit `.mcp.json` (it holds a secret).
- Never download, copy or hotlink anything from kai.house or assets.kai.house. `kai-house-reference/` is for looking at only; nothing in `src/` or `public/` may import or copy from it.
- All copy is obvious placeholder text ("Placeholder name", "placeholder role one"). Do not invent real content for the user.
- Do not add npm dependencies. Everything left can be done with what is installed.
- Do not run `npm audit fix`.
- One step at a time. After each step:
  1. `npm run build` must finish with 0 errors. Fix anything you broke.
  2. Update `auto-dev/PROGRESS.md`: tick the step, add short "Step N:" notes for every decision you made and everything you could not check, and rewrite the "Next step" paragraph.
  3. Commit with a message like `Step 9: ...`.
- If you cannot check something in a browser, say so in PROGRESS.md. Never write that something works when you only know that it builds.
- Keep the existing code style: one class per file, small doc comments, constants named at the top of the file, spec section numbers in comments.

## 4. First action: commit step 8

Run `git status`. You should see modified `auto-dev/PROGRESS.md`, `src/pages/index.astro`, `src/room/Experience.ts`, `Renderer.ts`, `events.ts`, `modes/CRTMode.ts`, `utils/screenGeo.ts`, and new `modes/FlyMode.ts`, `SuiteMode.ts`, `TVMode.ts`, `src/ui/suite.ts`, plus this file and `auto-dev/STOP`.

1. Run `npm run build`. It passed on 2026-11-13 (2 pages, 0 errors).
2. Add `auto-dev/STOP` to `.gitignore`.
3. Commit everything else as `Step 8: TV mode with bokeh composer and background swap, laptop mode with its panel`.

## 5. Step 9: HTML labels, room rectangle, luma probe, buttons

Spec: section 10 ("Page skeleton", "Edge words", "Overlay buttons", "Colour tokens") and section 11.

Do it in two commits, 9a then 9b.

### 9a. Labels and room rectangle

**Markup** (in `index.astro`, inside `.room-experience`, next to `#room`):

```
span.edge-word.edge-word--left   data-luma="portfolio"   year line "(year)" + word "placeholder left"
button.edge-word.edge-word--left.edge-word--proxy        invisible, same position, aria-label "Open the computer"
span.edge-word.edge-word--right  data-luma="software"    year line + word "placeholder right" + italic sub "coming soon"
span.edge-word.edge-word--top    data-luma="wordmark"    "placeholder name" + role line
button.edge-word.edge-word--top.edge-word--roleproxy     invisible, aria-label "Next role"
```

**Stacking**: label text is `z-index: 1`, the canvas container `#room` is `z-index: 2`, proxy buttons are `z-index: 6`. The canvas is transparent, so the room can pass in front of the text while the invisible buttons still receive clicks. Check what z-index `#room` has now and keep the loading bar, `.suite` and `.blackout` above everything as they are.

**CSS values**:
- Word: 14px, `letter-spacing: .35em`, lowercase, colour `#2d2b28`.
- Year line: 13px bold, `#6b6760`, `letter-spacing: .25em`.
- Role and sub lines: 11px, `#8a867f`; the sub line is italic with `.2em` spacing.
- Left and right labels: `top: 50%`, `left: 14%` / `right: 14%` by default, vertically centred.
- Top label: horizontally centred, `top: 24px`.
- Class `edge-word--corners` on `.room-experience` pins left and right labels to the bottom corners: 24px from the side, 18px from the bottom, plus `env(safe-area-inset-*)`.
- Labels start invisible and fade in over 1.6s, starting 500ms after the room is built.
- Left label is at 75% opacity; 100% when it has class `is-hot`.
- Class `edge-word--lumaflip` sets text colour `#f2efe9` (used in 9b).
- Proxy buttons: no background, no border, transparent text, `cursor: pointer`, with a visible `:focus-visible` outline.

**`src/ui/roomRect.ts`**: export `initRoomRect(experience)`.
- Once `experience.world` exists, build a `THREE.Box3` from the room models (`new Box3().setFromObject(...)` over `world.models`).
- Project the 8 corners of that box through a **clone of the camera placed at the home view** (use `HOME_VIEW` and `fovForAspect` from `Camera.ts`; do not use the live camera, the labels must not move when the user orbits). Take the min and max in screen pixels.
- Emit `kai:room-rect` with `{left, right, top, bottom, viewportWidth, viewportHeight}` in CSS pixels. Add `roomRect` to `EVENTS` and a `RoomRectDetail` type.
- Recompute and re-emit on `sizes` `'resize'`.

**`src/ui/labels.ts`**: export `initLabels(root)`.
- On `kai:room-rect`: left gap = `left`, right gap = `viewportWidth - right`. Set the left label's `left` to `max(leftGap / 2, 60)` px with `transform: translate(-50%, -50%)`, and the same on the right side. If either gap is under 120px, add `edge-word--corners` to the root and clear the inline positions; otherwise remove it. Move each proxy button with its label.
- Hide all labels (opacity 0, proxies `disabled`) while a mode runs: `kai:crtmode` with phase not `'idle'`, `kai:tvmode {active:true}`, `kai:suite {active:true}`. Show them again when all three are inactive.
- `kai:hover {id:'computer', hovered}` toggles `is-hot` on the left label. Hovering or focusing the left proxy also sets `is-hot`.
- Clicking the left proxy does `emit(EVENTS.computerActivate)`. This is the keyboard route into the computer, so it must be reachable with Tab and activate with Enter.
- Roles: an array of three placeholder strings. Every 3400ms fade the role line out over 450ms, swap the text, fade in. Clicking the role proxy skips ahead with a 200ms fade. Pause the timer when `document.hidden`. With `prefers-reduced-motion: reduce`, swap with no fade.

Wire both from the boot script at the bottom of `index.astro`, the same way `initSuite` and `initLoading` are wired.

**Done when**: build passes; labels are in the page; the logic above is in place. Note in PROGRESS.md that margins, corner fallback and occlusion need a browser check at 1600, 1024 and 390 pixels wide.

### 9b. Luma probe, settings button, sound button

**`src/ui/lumaProbe.ts`**: export `initLumaProbe(experience)`.
- Purpose: when the room is drawn behind a label, decide whether the label needs light text and whether it is covered by the room.
- Reading WebGL pixels only works straight after a render. Hook it like this: add an optional `afterRender` callback list to `Renderer` (called at the end of `render()`), and do the reads there with `renderer.instance.getContext().readPixels(...)`. Do not turn on `preserveDrawingBuffer`.
- Run only every 20th frame, and only if the camera matrix or the canvas size changed since the last probe.
- For each `[data-luma]` element: take its bounding rectangle, pick three sample points (25%, 50%, 75% across, vertically centred), convert to canvas pixels (multiply by the renderer pixel ratio, and flip y: `canvasHeight - y`), read a 6x6 patch at each.
- Per pixel: alpha = `a / 255`. Luma = `0.2126 r + 0.7152 g + 0.0722 b` on 0 to 1 values. If alpha is 0 the pixel counts as luma 0.95 (the page). Otherwise blend: `luma * alpha + 0.95 * (1 - alpha)`. Average luma and alpha over all three patches.
- Hysteresis, kept per element: `light` becomes true when luma < 0.45 and false when luma > 0.55. `covered` becomes true when alpha > 0.5 and false when alpha < 0.3.
- When either flag changes, emit `kai:text-luma` with `{id, light, covered}` where `id` is the `data-luma` value. Add `textLuma` to `EVENTS` and a detail type.
- In `labels.ts`, on `kai:text-luma`: toggle `edge-word--lumaflip` on that label for `light`; when `covered`, set `disabled` on that label's proxy button so clicks reach the 3D scene.
- Skip probing while `experience.modeActive`.

**Overlay buttons**: add `<div class="overlay">` after `.stage` with two buttons, `.settings` and `.sound`.
- Each holds an 18px inline SVG, `fill: none`, `stroke: currentColor`, `stroke-width: 1.6`. Draw simple original icons: a gear or sliders for settings; a speaker with two arcs for sound.
- Colour `#2d2b2859`, `#2d2b28d9` on hover and focus.
- Position fixed: `top: clamp(14px, 3vh, 28px)`, `right: clamp(16px, 3vw, 32px)`. The settings button sits 34px further left.
- Hit area at least 44x44px (padding), `aria-label` on both, `aria-pressed` on sound.
- Hide both while a mode is active, same rule as the labels.

**`src/ui/overlay.ts`**: export `initOverlay(root)`.
- Sound: keep a `muted` flag in `localStorage` under `bridge:muted` (wrap in try/catch; default unmuted). On click toggle it, swap the two arcs for an × in the icon, set `aria-pressed`, and emit `kai:mute {muted}`. Emit once at startup too, so audio starts in the stored state. Add `mute` to `EVENTS`.
- Settings: emit `kai:intro-open` on click (add `introOpen` to `EVENTS`). Nothing listens yet; the spec's WhiteIntro is off by default. Do **not** build WhiteIntro. Record in PROGRESS.md that the settings button is wired but opens nothing.

**Done when**: build passes with both parts. Note what needs a browser check: label text flips to light when the room is behind it; a covered left label lets clicks through to the room.

## 6. Step 10: audio

Spec: section 9. Create `src/room/Audio.ts` (class `RoomAudio`), constructed in `Experience.buildWorld()` and ticked from `Experience.update()` after `navigation.update()`.

There are no sound files and you must not add any. Everything is synthesized.

**Start-up**
- Create nothing until the first `pointerdown`, `touchend` or `keydown` on `window`. Then build one `AudioContext` (`window.AudioContext || webkitAudioContext`). If neither exists, do nothing, silently.
- `master` gain starts at 0 and ramps linearly to 0.9 over 8 seconds.
- `document` `visibilitychange` (hidden) and `window` `blur`: `context.suspend()`. `focus` or visible: `context.resume()`.

**Graph**

```
master Gain
├─ room tone (gain 0.6): generate 4s of very quiet brown noise in a looped AudioBuffer,
│    lowpass 400 Hz, level about 0.05. This stands in for the missing room-tone sample.
└─ roomba: synth → motor Gain → Gain 0.22
     ├─ lowpass (9000 Hz near → 1800 Hz far) → HRTF PannerNode → master
     └─ send Gain (0.06 near → 0.35 far) → ConvolverNode (0.4s room impulse) → master
```

- **Roomba synth**: a 4-second looped brown-noise buffer → bandpass 400 Hz, Q 0.9 → gain 0.9; plus a 120 Hz sine at gain 0.16 whose frequency is wobbled by two LFOs (3.1 Hz and 0.73 Hz, a few Hz of depth each). Sum both into the motor gain.
- **Brown noise**: `last = (last + 0.02 * white) / 1.02; sample = last * 3.5`.
- **Room impulse**: stereo buffer, 0.4 seconds, white noise smoothed with a short running average and multiplied by an exponential decay (`Math.pow(1 - t / length, 3)` is fine).
- **Panner**: `panningModel: 'HRTF'`, `distanceModel: 'inverse'`, `refDistance: 7.3`, `rolloffFactor: 1`. The listener stays at the origin facing −z.

**Every frame** (only when the context is running):
- Get the roomba's world position (`world.models.roomba`, or the pivot node `Roomba.ts` moves; read that file) and project it with `camera.instance` to NDC.
- `azimuth = ndc.x * 90°`. If the point is behind the camera, mirror it (`180° - azimuth`). `elevation = ndc.y * 20°`.
- Ear point = 30% of the way from the look-at target (`navigation.target.smoothed`) to the camera position. `distance` = ear point to roomba.
- Set the panner position to `(sin(az)·cos(el)·d, sin(el)·d, −cos(az)·cos(el)·d)`.
- `far = clamp((distance − 8) / (19 − 8), 0, 1)`. Lowpass frequency = `9000 + (1800 − 9000) · far`. Send gain = `0.06 + (0.35 − 0.06) · far`.
- Edge fade = `1 − smoothstep(0.85, 1.15, |ndc.x|)`.
- Motor gain target = `world.roomba.motor · edgeFade`. Use `setTargetAtTime(value, context.currentTime, 0.05)` for every per-frame parameter change. Never assign `.value` directly; it clicks.

**Mute and duck**
- `kai:mute {muted}`: `master.gain.setTargetAtTime(muted ? 0 : 0.9, now, muted ? 0.15 : 0.4)`. Remember the flag so a mute that arrives before the context exists is applied when it is created, and so the 8-second fade-in does not override it.
- Duck to 0 the same way while `kai:crtmode` phase is not `'idle'`; restore after. Read `CRTMode.ts` first: if it already makes its own sounds, leave them alone; if it has none, do not add any.

**TV audio**: only if `world.liveScreens` exposes a real `<video>` element (read `world/Screens.ts`). If so, build the chain in spec section 9 with `createMediaElementSource`, and unmute the video only after the audio context has started. With the generated canvas pattern there is no TV sound. Skip it and say so in PROGRESS.md.

**Clean-up**: `destroy()` removes every listener and calls `context.close()`. Call it from `Experience.destroy()`.

**Done when**: build passes. Note for the browser check: nothing plays before the first click; the hum pans left and right as you orbit; the sound button silences it; switching tabs stops it.

## 7. Step 12: polish

One commit per item is fine. Spec: section 13.4.

1. **Reduced motion.** With `prefers-reduced-motion: reduce`: shorten camera flights in `FlyMode` and `CRTMode` to 300ms or less, turn off TV idle drift, stop the chair sway and steam animation, no label fades. Put one shared helper in `src/room/utils/motion.ts` that reads the media query and listens for changes.
2. **No-WebGL fallback.** Before `new Experience(...)` in the boot script, test for a `webgl2` or `webgl` context on a throwaway canvas. If missing, or if constructing the renderer throws, add class `no-webgl` to `.page` and show a plain HTML block: placeholder name, one line of text, and a normal link to `/portfolio`. Add a `<noscript>` with the same content.
3. **Context loss.** On the canvas: `webglcontextlost` → `preventDefault()` and stop rendering; `webglcontextrestored` → resize the renderer, set `needsUpdate = true` on all canvas and video textures, resume.
4. **Dispose.** Go through every class's `destroy()` and confirm it removes its listeners and disposes its geometries, materials, textures and render targets (the TV composer's targets included). Fix gaps.
5. **Keyboard access.** The left proxy already opens the computer. Add two more visually hidden but focusable buttons that emit `kai:macbook-activate` and `kai:tv-toggle`. Confirm Esc leaves every mode.
6. **Viewport zoom.** Remove `maximum-scale=1, user-scalable=no` from the viewport meta tag, then make sure `touch-action: none` is on `#room` so pinch still zooms the room and not the page.
7. **Meta tags.** Add to both pages: `<meta name="description">`, `og:title`, `og:description`, `og:type`, `og:url` (site is `https://abioladeyeye.com`), `twitter:card`, and `<link rel="canonical">`. Placeholder description text. No `og:image` (there is no image yet); record that in PROGRESS.md.
8. **Bundle size.** The build warns that the main chunk is over 500 kB because of three.js. Leave the code as is and set `build.chunkSizeWarningLimit` in the Vite config inside `astro.config.*`, unless a dynamic import is a one-line change.

**Done when**: build passes with 0 errors and 0 warnings.

## 8. When all three steps are done

1. In `auto-dev/PROGRESS.md`, tick steps 9, 10 and 12, and put a short section at the very top titled "Status: code steps complete" listing what is blocked on the user (section 9 below).
2. Make sure `auto-dev/STOP` exists.
3. Tell the user the build is finished and give them the browser checklist below. Do not claim it works; nobody has looked at it yet.

### Browser checklist for the user (http://localhost:4321/)

- Room is framed and lit sensibly; drag orbits, right-drag pans, wheel and pinch zoom, double-click resets.
- Chair sways, roomba drives without clipping furniture, steam is visible above the mug.
- Door opens with the whiteboard attached; whiteboard, laptop and TV screens are upright and readable.
- Click the computer: boot, push-in, blackout, portfolio page; Home returns with the pull-back.
- Click the laptop: fly-in, panel opens, closes with the button, Esc, or a click beside it.
- Click the TV: fly-in, foreground blurs, background colour does not jump.
- Labels sit centred in the side margins, drop to the corners when the window is narrow, and hide during modes.
- Sound: silent until first click, hum follows the roomba as you orbit, mute button works.
- Same checks on a phone.

## 9. Blocked on the user. Do not attempt.

- Real room models and baked textures. Needs Blender, which is not installed. The loader already switches to real files when all 12 GLBs are in `public/assets/` (names in `MODEL_NAMES` in `src/room/assets.ts`). The roomba path JSON must be re-exported to match.
- The full destination app behind the computer (spec phase 11). The user has not decided what goes there. `/portfolio` stays a minimal page.
- Real content: name, roles, label copy, project list, videos, OG image.
- The 8 `npm audit` findings from step 0.

## 10. If you get stuck

- A build error you cannot fix in three attempts: revert that file with `git checkout -- <file>`, write what happened in PROGRESS.md, and move to the next item.
- Something in the spec contradicts the code that exists: the existing code wins. It was written from the same spec with decisions recorded in PROGRESS.md. Note the conflict there.
- A choice the spec does not cover: pick the simpler option, record it in PROGRESS.md under "Decisions made on the user's behalf", and continue. Do not stop to ask.
