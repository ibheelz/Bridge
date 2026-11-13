# kai.house — Build Spec (v2)

> Everything needed to build a 3D-room portfolio like https://kai.house from start to finish.
> **Source:** read directly from the live production bundles, CSS, GLB files, textures and audio on 2026-11-13 (site build `8be60b24`, asset version `?v=2026-10-27-1`). Values below are the real constants from the code, not estimates, unless marked *(inferred)*.
> **Replaces** the earlier analysis. See "Corrections to v1" at the bottom for what was wrong.
> **Reference files:** `kai-house-reference/` (screenshots, GLB structure report, roomba path, an example baked atlas).
> **Do not reuse Kai's assets.** His models, baked textures, videos, logos and copy are his. This spec is for building an original room with the same techniques.

---

## 0. What the site is

Two separate apps on one domain:

| | Room (`/`) | Win95 portfolio (`/portfolio`) |
|---|---|---|
| What | A small isometric-style 3D room floating on a cream background | A full DOM-based Windows 95 desktop with draggable windows |
| Stack | Nuxt 3 (static) + Three.js r169 | A second, independent Nuxt 3 build with `baseURL: /portfolio/` |
| JS | ~900 KB (three + app in one chunk) + 177 KB Nuxt runtime | ~722 KB + 156 KB CSS |
| Link between them | Click the CRT → boot animation → hard navigation to `/portfolio?boot=skip` | "Home" icon → shutdown dialog → hard navigation to `/#powerdown` |

Hosting: Firebase Hosting (project `kai-room-portfolio`) for both apps; large videos on `https://assets.kai.house/` (Cloudflare). One serverless endpoint: `/portfolio/api/claude95` (chat).

The page title is "Kai's House". Favicon is an inline SVG house glyph (`#141414` on `#ECEAE4`, 12px radius).

See `kai-house-reference/room-desktop-1600x900.png` for the default view.

---

## 1. The room at a glance

- A cut-away corner room (two walls + floor), seen from a fixed 3/4 angle, sitting on a warm white radial gradient. The canvas is transparent; the gradient is CSS.
- **Night bake**: all lighting is baked into textures. The room itself is fairly dark and moody; the page around it is bright.
- Contents: dark slatted wall with Win95 posters, beige CRT + tower on an orange desk with drawers, mesh office chair, plant, door (ajar, whiteboard on it), wall TV over a media console with books, dark sofa, oval coffee table with a MacBook and a book, rug, roomba, pegboard, coffee mug with steam.
- Three text labels float in the page margins (HTML, not 3D): top `kai.house` + rotating role, left `(1995) portfolio`, right `(2026) software — coming soon`.
- Two small icon buttons top-right: settings (gear) and sound.

### Interactions

| Target | Trigger | Result |
|---|---|---|
| CRT monitor (invisible hit box around it) | hover | cursor pointer, left label lights up |
| CRT monitor, or left label `portfolio` | click | **CRT mode**: BIOS boot plays on the CRT, camera pushes in, room lights fade, cut to black, navigate to `/portfolio?boot=skip` |
| TV screen or the remote on the table | click | **TV mode**: camera flies to a couch view with depth-of-field. Click again / Esc exits |
| MacBook screen | click | **Suite mode**: camera flies to the laptop, a glass panel "download for mac" lists apps. Esc / × / backdrop closes |
| Door | click | Code exists (25° swing, 0.9 s) but is **disabled** (`DOOR_CLICK_ENABLED = false`). Clicking the door just swallows the click |
| Empty space | drag | orbit (clamped to a quarter-sphere) |
| | right/middle/ctrl/shift-drag, or two-finger drag | pan the look-at target |
| | wheel / pinch | zoom (radius 10–50) |
| | double-click / double-tap | reset view |
| Top label role line | click | cycle to next role |
| Gear button | click | shows the white intro overlay again |
| Sound button | click | mute / unmute |

Always-on ambient motion: roomba drives a looped path, chair top slowly swivels, coffee steam shader, live animated canvases on four screens, room-tone audio after first gesture.

URL hashes: `#debug` (Tweakpane + orbit debug camera), `#clean` (no intro, no overlay UI, no suite), `#powerdown` (arriving back from the portfolio).

---

## 2. Tech stack (actual)

| Layer | What |
|---|---|
| Framework | Nuxt 3, statically generated. Room is one client-only component (`RoomExperience.client.vue`) wrapped in `<ClientOnly>` |
| 3D | Three.js **r169**, `WebGLRenderer`, `GLTFLoader` + `DRACOLoader` (JS decoder served from `/draco/`) |
| Structure | Bruno Simon's "Experience" singleton boilerplate (same shape as his *my-room-in-3d* project): `Experience`, `Time`, `Sizes`, `Resources`/`Loader` (EventEmitter), `Camera`, `Renderer`, `World`, `Navigation` |
| Post-processing | `EffectComposer` → `RenderPass` → `BokehPass` → `OutputPass`. **Only used during TV mode.** Normal frames render directly |
| Animation | Hand-rolled: per-frame lerp with easing functions. No GSAP, no Tone.js, no animation mixer (GLBs have no animations) |
| Audio | Raw Web Audio API: HRTF panners, convolver reverb, synthesized roomba motor, `<video>` element routed through filters |
| Wheel input | `normalize-wheel` |
| Debug | Tweakpane, only when `#debug` |
| CSS | Scoped SFC styles, no framework. Font stack `Helvetica Neue, Helvetica, Arial, sans-serif` — no web fonts |
| Bundled but unused in practice | `OrbitControls` (debug only), `RGBELoader` (loader registered, no `.hdr` requested), KTX2 strings (from GLTFLoader; no KTX2 textures) |

---

## 3. Assets

### 3.1 Models — 13 GLBs, 3.4 MB total, ~727k triangles

Exported from **Blender 5.2** (glTF I/O v5.2.41). Every GLB is **one node, one mesh, no materials, no images, no animations**, Draco-compressed (`KHR_draco_mesh_compression` required). Attributes: `POSITION`, `NORMAL`, `TEXCOORD_0` only. World transforms are baked into the node TRS, so loading everything at the origin reassembles the room.

| File | Size | Tris | Node position (x,y,z) | Role |
|---|---|---|---|---|
| `roomModel.glb` | 42 KB | 5.7k | −4.40, 3.14, 2.29 | walls, floor, shell |
| `workStation.glb` | 940 KB | 248k | −3.43, 1.83, 3.71 | desk, drawers, tower, plant, keyboard, mug |
| `livingRoom.glb` | 332 KB | 92k | 2.32, 0.29, −0.79 | sofa, rug, table, console, books, TV body |
| `wallDecor.glb` | 391 KB | 76k | −3.42, 3.53, −4.36 | pegboard, posters |
| `retro.glb` | 60 KB | 12k | −3.45, 0.32, 0.18 (scale 2.55) | CRT monitor body |
| `macbook.glb` | 774 KB | 101k | 2.09, 1.17, −0.75 (scale 3.16) | laptop |
| `door.glb` | 60 KB | 14k | −2.11, 4.44, −4.62 | door (origin at hinge) |
| `chairTop.glb` | 729 KB | 173k | −1.45, 1.12, −0.05 | swivelling part of chair |
| `roomba.glb` | 11 KB | 1.6k | −1.81, 0.32, 4.03 | roomba |
| `book.glb` | 2 KB | 130 | 3.30, 1.21, −0.56 | book on table |
| `remote.glb` | 5 KB | 524 | 3.25, 1.36, 2.60 | TV remote |
| `coffeeSteam.glb` | 39 KB | 2.3k | −2.77, 2.41, −1.37 | a 0.28 × 0.5 subdivided plane (no Draco, no normals) |
| `screens.glb` | 17 KB | 1.4k | (verts in world space) | 5 named meshes, see below |

**Scale:** the room is roughly 9.4 × 9.4 units in footprint and ~5.7 tall, centred near the origin, floor at y ≈ 0.32. Y-up. The two walls are on the −x and −z sides, so the camera looks in from +x/+z.

**Why separate GLBs:** each is its own bake group with its own texture, and the moving ones (door, chairTop, roomba) need their own pivot.

**`screens.glb` meshes** (names are the API between Blender and code):

| Mesh | Bounds | Notes |
|---|---|---|
| `screenCRT` | x −2.98…−2.93, y 2.69…3.60, z −0.58…0.63 | curved (640 tris), faces +x, ~1.2 wide × 0.9 tall (4:3) |
| `screenMacbook` | ~0.90 × 0.62 | tilted |
| `screenTV` | x 0.39…4.05, y 2.49…4.86 | flat quad, 3.66 × 2.37, on the −z wall |
| `screenWhiteboard` | ~0.90 × 1.51 | flat quad; re-parented to the door at runtime so it swings with it |
| `hoverDeskTop` | covers the desk area | made invisible; legacy hover-glow overlay, effectively unused |

Screen UVs must be laid out 0–1 across the visible glass, with V flipped the glTF way (all canvas textures use `flipY = false`).

### 3.2 Baked textures — 11 JPGs, 5.8 MB total

One per model (not for steam or screens). Named `baked-<model>.jpg`, loaded under key `baked_<model>`.

| Size | Files |
|---|---|
| 4096² | roomModel (920 KB), workStation (1.66 MB), livingRoom (1.19 MB), retro (1.40 MB) |
| 1024² | wallDecor, macbook, door, chairTop |
| 512² | roomba, book |
| 256² | remote |

They are tightly packed UV atlases on black (see `kai-house-reference/example-baked-atlas-workStation.jpg`). Poster art, book spines and the keyboard are part of the bake. Coverage is low on some (the in-site joke terminal prints "roomModel… coverage 24.3%").

### 3.3 Other files

| File | Details |
|---|---|
| `/assets/roomba-path.json` | `{ origin:[x,y,z], points:[[x,y,z]…] }` — 19 waypoints at y = 0.32, exported from Blender. Copy in `kai-house-reference/` |
| `/assets/audio/roomtone-corridor.m4a` | 40 s AAC stereo loop, 649 KB |
| `/assets/audio/hardrive.mp3` | 13.3 s, 265 KB; looped from 4 s to (end − 0.3 s) |
| `/assets/audio/beep.mp3` | 1.9 s, 38 KB |
| `/assets/screens/bmw-60-sound.mp4` | 8.1 MB, the TV video (with audio track) |
| `/assets/screens/wallpaper-bigsur.jpg` | 4096 × 2304, 3.3 MB (MacBook screen wallpaper — oversized) |
| `/assets/screens/win95-preview/*` | `desktop.jpg` 1024×768, `window.png` 565×515, `taskbtn.png` 104×30, `startmenu.png` 167×285, `start-pressed.png` 110×34 — screenshots of the real portfolio used as sprite plates on the CRT |
| `/assets/energy.jpeg` | 288×175 Energy Star logo for the BIOS screen |
| `/assets/brands/*.png` | 5 small logos (~96 px tall) — referenced by a brand-bar feature that is currently compiled out |
| `/draco/draco_decoder.js`, `draco_wasm_wrapper.js`, `draco_decoder.wasm` | decoder; the app forces the JS decoder (`setDecoderConfig({type:'js'})`) |

Total blocking download before the room appears: ~9.2 MB (GLBs + bakes). Every URL carries a manual cache-bust query `?v=2026-10-27-1`.

---

## 4. Engine architecture

### 4.1 Experience singleton

```
new Experience({ targetElement })      // returns existing instance if one exists
  time        Time          delta & elapsed in ms, own rAF tick
  sizes       Sizes         emits 'resize'
  config      { pixelRatio: clamp(dpr,1,2), width, height, smallestSide, largestSide, debug: hash==='#debug' }
  scene       THREE.Scene
  camera      Camera
  renderer    Renderer
  resources   Resources     groups → Loader
  world       World         builds everything on resources 'groupEnd' for group 'base'
  navigation  Navigation
  tvMode, crtMode, suiteMode
  lumaProbe, roomRect, roomAudio
```

`window.experience` is exposed. A `ResizeObserver` on the target element calls `resize()`.

**Frame order (every rAF):**
`camera.update → tvMode.update → crtMode.update → suiteMode.update → (tvMode.rendersFrame() ? composer.render() : renderer.render()) → lumaProbe.update → world.update → navigation.update → roomAudio.update`

Note navigation updates *after* render, so the camera is one frame behind input. Harmless.

### 4.2 Renderer

```js
new WebGLRenderer({ alpha: true, antialias: true })
setClearColor('#ffffff', 0)            // transparent
outputColorSpace = SRGBColorSpace
// no tone mapping, no shadows
canvas: position absolute; top/left 0; width/height 100%
```

### 4.3 Camera

```js
PerspectiveCamera(fov, aspect, 0.1, 150), rotation order 'YXZ'
fov = aspect >= 1 ? 20
                  : min(55, 2·atan(tan(10°) / aspect · 0.95) in degrees)   // widen on portrait so the room still fits
```

A narrow 20° lens from far away (radius 43) is what gives the near-isometric look. There are three camera objects: the real one, `modes.default` (driven by Navigation), and `modes.debug` (OrbitControls at −15,15,15). Each frame the real camera copies position + quaternion from the active mode. The cinematic modes write the real camera directly and set `navigation.suspended = true`.

### 4.4 Navigation (orbit)

```js
spherical.value   = Spherical(radius 43, phi 0.35π, theta 0.25π)   // home view
target.value      = (0, 2, 0)
smoothing         = 0.005   // smoothed += (value − smoothed) · 0.005 · deltaMs
limits: radius 10…50 | phi 0.01…π/2 | theta 0…π/2 | target x ±4, y 1…6, z ±4
```

- Drag: `theta −= dx / smallestSide`, `phi −= dy / smallestSide` (sensitivity 1).
- Alt-drag (button 1/2, ctrl, shift, or 2 touches): move target along camera up/left by `0.01` per pixel, clamped.
- Wheel: `radius += normalizeWheel(e).pixelY · 0.01`. Pinch: `zoomIn((prevDist − dist) · 3)`.
- Double-click, or double-tap (each tap < 250 ms and < 12 px travel, second within 350 ms): reset to home.
- `contextmenu` is prevented globally. Touch handlers call `preventDefault` (page has `touch-action: none`, `overscroll-behavior: none`, `user-select: none`, viewport `maximum-scale=1, user-scalable=no`).
- Emits `kai:zoom {zoomedIn}` with hysteresis: true when smoothed radius < home − 3, false again at ≥ home − 0.4.
- `captureState()` / `restoreState()` snapshot spherical + target so cinematic modes can return exactly.

### 4.5 Resources

One group `base` with 13 GLBs then 11 textures. Loader picks by extension (regex tolerates the `?v=` query): `jpg/png` → `Image` (crossOrigin anonymous) wrapped in `THREE.Texture`; `glb/gltf` → GLTFLoader; `drc`; `hdr`. Events: `progress` (per file → loading bar `loaded/toLoad`), `groupEnd`, `end`.

### 4.6 World

```js
order = ['roomModel','workStation','livingRoom','wallDecor','retro','macbook','door','chairTop','roomba','book','remote']

// per name
tex = resources.items['baked_'+name]
tex.flipY = false; tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4
material = new MeshBasicMaterial({ map: tex, side: DoubleSide })
// every mesh in the GLB gets that material; castShadow/receiveShadow false; group added to scene
```

Fallback while a bake is missing: a "clay" `MeshStandardMaterial('#e8e5e0', roughness .85)` plus `DirectionalLight('#fff', 2.2)` at (6,8,6) and `AmbientLight('#fff', 0.9)`. Useful during development — build this first so the room is visible before any baking.

Then: `Door`, `ChairTop`, `Roomba`, `Screens`, `CoffeeSteam`, `Interactions`.

---

## 5. Animated objects

**ChairTop** — first mesh's `rotation.y = base + sin(elapsedMs · 0.0005) · 0.5` (±28.6°, ~12.6 s period).

**Door** — `toggle()` tweens group `rotation.y` between base and base + 25° over 0.9 s with cubic ease-in-out. Listens for `kai:door-toggle`. On first update it `attach()`es `screenWhiteboard` so the board follows the door. Raycast click is disabled.

**Roomba** — fetches the path JSON, then a 3-state loop per waypoint:

| State | Behaviour |
|---|---|
| `turn` | rotate toward next point at 1.8 rad/s (shortest way); heading = `atan2(−dx, −dz)` |
| `drive` | speed 0.35 u/s × factor, where factor = `max(min(√(travelled/0.35), √(remaining/0.6)), 0.18)` (eases in and out of each leg) |
| `pause` | 350 ms, then next point (wraps) |

Vibration on top: `y += m·0.0025·(0.6·sin(81.7t) + 0.4·sin(54.6t+1.7))`, `rot.x += m·0.006·sin(71t+0.5)`, `rot.z += m·0.006·sin(57.2t+2.1)`, with `m` = motor level (drive: speed factor, turn: 0.5, pause: 0.15). `roomba.motor` is read by the audio system. Delta is capped at 100 ms.

**CoffeeSteam** — `ShaderMaterial({ transparent, depthWrite:false, side:DoubleSide })`, uniforms `uTime` (elapsed ms), `uTimeFrequency 0.0004`, `uUvFrequency (5,4)`, `uColor #f5efe6`. 2D classic Perlin noise.

```glsl
// vertex
vec2 dispUv = uv * vec2(0.5, 0.7);
dispUv.y -= uTime * uTimeFrequency * 0.5;
float disp = cnoise(dispUv * 3.0);
float strength = pow(1.0 - uv.y, 2.0);          // pinned at the mug edge
newPosition.x += disp * 0.12 * strength;
newPosition.z += disp * 0.08 * strength;

// fragment
vec2 uv = vUv * uUvFrequency;  uv.y -= uTime * uTimeFrequency;
float noise = min(cnoise(uv), 1.0);
noise *= min(min(vUv.x*4.0, (1.0-vUv.x)*4.0), 1.0);   // side fade
noise *= pow(vUv.y, 0.5);                              // fade toward mug
noise *= (1.0 - vUv.y) * 1.2;                          // dissolve at free end
gl_FragColor = vec4(uColor, noise * 0.8);
```

---

## 6. Screens (live canvas textures)

`Screens` reads a config map `meshName → content`, builds a `MeshBasicMaterial({ map })` for each, and calls `update(deltaMs)` on every live texture each frame. All canvas textures: `CanvasTexture`, sRGB, `flipY=false`, and they only redraw when dirty and at most every ~33 ms.

```js
screenCRT:        { type: 'win95live' }
screenMacbook:    { type: 'mac', width:1024, height:673,
                    windows: [ {kind:'vscode', rect:[520,90,450,460], title:'Screens.js'},
                               {kind:'claude', rect:[56,64,520,500]} ] }
screenTV:         { type: 'video', src: '/assets/screens/bmw-60-sound.mp4' }
screenWhiteboard: { type: 'whiteboard', width:1024, height:1583 }
```

Supported types in code: `video`, `hourglass`, `mac`, `tvdash`, `whiteboard`, `ipadlock`, `win95live`, `image`, solid colour fallback.

A shared lock `holder` makes sure only one screen performs a cursor/slide action at a time, so the room never has two screens "doing something" at once.

### 6.1 `win95live` (CRT, 1024×768, 30 fps cap)
A scripted fake user on sprite plates of the real portfolio. Draws `desktop.jpg`, then `window.png` at the window position, `taskbtn.png` at (75,737), optional `startmenu.png` at (0,449) + `start-pressed.png` at (0,734), then a white arrow cursor (scale 1.6).
- Home window position (232,61); title-bar grab offset (210,16); close button offset (544,17); desktop icon at (38,45); Start at (38,751); start-menu rows y = 471, 511, 551, 592, 632, 672.
- Step queue of `{move, ms}`, `{wait}`, `{down}`, with `do` callbacks. Cursor moves on a quadratic Bézier with a random perpendicular bulge (±0.18) and quad ease-in-out.
- Weighted random actions: drag window home (5 if away, else 0), drag away (1 or 4), close + reopen by double-click (2), open Start and hover 2–3 rows (2), wander (2). 1.8–5.2 s waits between.
- Resets on `kai:crt-screen-on`.

### 6.2 `mac` (MacBook)
Fake macOS desktop drawn entirely with Canvas 2D: wallpaper (cover), translucent menu bar with app name + `File Edit View Go Window Help` + live clock (America/Los_Angeles), and windows with traffic lights, 12 px radius, drop shadow. Window kinds: `claude` (a Claude Code terminal session), `devserver`, `vscode` (explorer tree, tabs, syntax-coloured code, minimap, status bar), `blender` (viewport grid, cube, outliner, timeline), `browser`. A black arrow cursor dwells 1.2–6 s then either focuses another window (40%), closes the front one and reopens it 1.6–3.2 s later with a scale/fade (25%), or moves within the front window. Terminal cursor blinks every 530 ms.

Terminal palette: bg `#1a1b1e`, chrome `#2c2c2e`, title `#9a9a9e`, text `#d6d6d8`, dim `#6e6e73`, accent `#d97757`, green `#30d158`, cyan `#64d2ff`, box `#55565a`, prompt `#e8e8ea`. VS Code palette: bg `#1e1e1e`, side `#252528`, activity `#333338`, tabs `#2d2d30`, status `#007acc`, kw `#569cd6`, str `#ce9178`, comment `#6a9955`, fn `#dcdcaa`, type `#4ec9b0`, var `#9cdcfe`.

### 6.3 `video` (TV)
`<video muted loop playsInline autoplay preload=auto crossOrigin=anonymous>` → `VideoTexture`. Retries `play()` on `canplay`, on first `pointerdown`/`touchend`, and on `visibilitychange`. The audio system later un-mutes it and routes it through Web Audio.

### 6.4 `whiteboard`
Static hand-written board: off-white `#f4f2ec`, `'Marker Felt','Segoe Print','Comic Sans MS',cursive`, seeded jitter (LCG seed 7) on position/rotation so it is identical every load. Items: title (underlined), todo rows with checkbox / tick / strike-through, coloured notes (`#1d4ed8`, `#c2271f`), a doodled cube.

### 6.5 Built but not currently mounted
- `tvdash` — Apple-TV-style carousel: 12 project tiles (132→214 px wide when focused, 150 px spacing), focused tile plays a `.webm` thumb loop, glow ring, title/role label, auto-advance every 4–8 s (8–12 s every 5th), slide 620 ms. Has `focusNext/Prev/Index`, `setMode('held')`.
- `ipadlock` — iOS lock screen with live time/date.
- `hourglass` — 15×19 pixel-art hourglass, yellow `#ffd60a` sand on `#0b0e13`, drains over 4 s, holds 480 ms, flips in 4 steps of 120 ms.

---

## 7. Interactions (raycasting)

- **Hit box for the computer:** `Box3` from `screenCRT`, expanded by 16% of its largest side, unioned with a copy pushed back along the screen normal by 0.9 × largest side (so the whole monitor body counts). An invisible `BoxGeometry` mesh of that size is the only hover target.
- Pointer NDC from `clientX/innerWidth`, `clientY/innerHeight`. Hover is recomputed on `pointermove` unless a drag is in progress.
- **Click vs drag:** a click only counts if the pointer moved < 6 px between down and up.
- **Click priority:** door meshes (swallow) → `screenMacbook` → `kai:macbook-activate` → `screenTV` or remote meshes → `kai:tv-toggle` → if hovering the hull → `kai:computer-activate`.
- Hover sets `cursor: pointer` on the target element and emits `kai:hover {id:'computer', hovered}`.

### Screen-relative camera helper (used by all modes)
`getScreenGeo(meshName)` → `center` (bbox centre in world), `normal` (vertex 0 normal in world, flipped to face the room centre/target), `right = normal × up`, `size` (bbox size). Presets are then expressed relative to the screen, so re-exporting the model never breaks camera moves.

`fovToFrame(width, dist, aspect) = 2·atan((width / (2·max(aspect, .01))) / dist)` — picks the FOV that makes `width` fill the view horizontally at a given distance; clamped to 16…72°.

---

## 8. Cinematic modes

All three: snapshot `{pos, target, fov, nav}`, suspend navigation, lerp position/target/FOV with cubic ease-in-out `t<.5 ? 4t³ : 1 − (−2t+2)³/2`, `lookAt` every frame, restore the snapshot on exit.

### 8.1 CRT mode (the main event)

Phases are broadcast as `kai:crtmode {phase}`:

| Phase | Duration | What happens |
|---|---|---|
| `powering` | 320 ms | Screen material swapped to the BIOS boot canvas; hard-drive loop starts (gain 0.15); a hidden `<iframe src="/portfolio?boot=skip">` is appended to pre-warm the next page |
| `pushing` | 2600 ms | Camera → `center + normal·(size.length()·3.6) + right·0.9 + (0, 1.45, 0)`, target → screen centre, FOV → frames `maxSide·2.45` |
| `booting` | until boot text ends | Camera holds with a tiny drift (`sin(t·0.0007)·0.012`, `cos(t·0.0005)·0.0072`) |
| `lightsout` | 140 ms + 110 ms | Every room/screen material `color` is multiplied down to black (room first, then the CRT itself) |
| `blackhold` | 500 ms | hold |
| `black` | — | Full-screen black div (`z-index 60`), then after two rAFs `location.href = '/portfolio?boot=skip'` |

Controls during boot: `2` or clicking the CRT = skip straight to `black`; `Esc`/`Delete` = `aborting` (900 ms fly back, restore materials). Audio master is ducked whenever phase ≠ `idle`.

**Arrival (`/#powerdown`)**: page starts under a black overlay → `arrivewait` (CRT material set to dark `#0a0f0c`) → `arrive` 900 ms held close-up (distance `size.length()·0.95`, frame `maxSide·0.9`) → `arrivepull` 2600 ms back to the home view → 5 s later the CRT turns back on (`kai:crt-screen-on`). The hash is removed with `history.replaceState`.

**BIOS boot canvas** (1024×768, black): `18px "Courier New"` in `#d3d3d3`, 29 px line height, 48 px left margin, top 40. Three phases with gaps of 500 ms, 1200 ms and 1000 ms:
1. POST lines (Phoenix AwardBIOS header, CPU, memory test, drives, "Loading operating system…") with per-line delays 50–300 ms, plus two "sequence" lines where a filename (green `#4ade80`) is replaced in place every 120–150 ms. Energy Star logo top-right, 170 px wide.
2. Screen clears; a box-drawing ASCII banner (12 px monospace, `#00ff00`, centred) appears with a beep (0.2 volume); hardware/driver sequences.
3. Clears to banner only; "Preparing Windows environment…", mount/registry sequences, "Starting Windows 95…", "Please wait…".
A block cursor (9×16) blinks at 350 ms after the last line. Footer at y = height − 44: `Press 2 to skip boot, DEL to go back` with the `2` blinking yellow `#ffcc00`.

### 8.2 TV mode
- Preset position: `center + normal·7.35 + right·0.87`, y forced to 2.1; target = centre − (0, 0.98, 0); FOV 33.
- Enter 2400 ms, exit 1800 ms. Idle drift: `sin(t·0.0006)·0.02`, `cos(t·0.00045)·0.012`.
- Composer is built lazily on first entry. `BokehPass({focus:1, aperture:0, maxblur:0.016})`. For the first 60% of the fly-in focus sits at 0.4 × TV distance with aperture 0; over the last 40% focus racks to the TV and aperture rises to 0.0009. On exit aperture falls to 0 in the first half.
- Because the composer target is opaque, `scene.background` is set to a canvas texture reproducing the CSS gradient (1024×640 radial, `#fff` → `#f1eee8` at 0.55 → `#dcd7cf`) and cleared again on exit.
- Emits `kai:tvmode {active}`. Esc exits.

### 8.3 Suite mode (MacBook)
- Position `center + normal·(size.length()·2.1) + (0, 0.55, 0)`, target centre, FOV 30. Enter 1800 ms, exit 1400 ms.
- Emits `kai:suite {active:true}` when the camera arrives (the panel fades in then), `{active:false}` when leaving. Closes on Esc or `kai:suite-close`.

---

## 9. Audio

Starts on the first `pointerdown` / `touchend` / `keydown`. Suspends on tab hide / window blur, resumes on focus.

```
master Gain  — ramps 0 → 0.9 over 8 s on start; mute/duck uses setTargetAtTime (0.4 s up, 0.15 s down)
├─ room tone loop (gain 0.6)
├─ roomba:  synth → motor Gain (follows roomba.motor · edge fade) → Gain 0.22
│            ├─ lowpass (9 kHz near → 1.8 kHz far) → HRTF panner → master
│            └─ send (0.06 near → 0.35 far) → Convolver (0.4 s room IR) → master
└─ TV:      MediaElementSource(video) → highpass 300 → lowpass 3500 → peaking 1.5 kHz +4 dB → compressor(−24 dB, 3:1)
             ├─ dry 0.75 ┐
             └─ Convolver → wet 0.25 ┴→ Gain 0.16 → HRTF panner → master
```

- **Roomba synth:** 4 s looped brown noise → bandpass 400 Hz (Q 0.9) → gain 0.9, plus a 120 Hz sine (gain 0.16) wobbled by 3.1 Hz and 0.73 Hz LFOs.
- **Room IR:** generated in code — smoothed white noise with exponential decay, 0.4 s, stereo.
- **Panners:** `HRTF`, `inverse` distance model, refDistance 7.3, rolloff 1. Listener stays at the origin facing −z; each source is placed from its **screen position**: project to NDC, azimuth = `ndc.x · 90°` (mirrored if behind the camera), elevation = `ndc.y · 20°`, distance = distance from an "ear" point (30% of the way from the look-at target to the camera). So audio pans as you orbit.
- Roomba fades out as it nears/leaves the screen edge (`1 − smoothstep(|ndc.x|, 0.85, 1.15)`); distance 8 → 19 units maps to the muffling/reverb amount.
- CRT mode sounds: hard-drive loop via its own `AudioContext`; beep via `new Audio()`.
- **No sound on hover/click in the room.** (Click sounds exist only in the Win95 app.)

---

## 10. HTML / CSS layer

### Page skeleton
```
main.page (bg #010101)
  .stage
    .room-experience                       ← radial-gradient(120% 90% at 50% 38%, #fff 0, #f1eee8 55%, #dcd7cf)
      .room-experience__target (z 2)       ← canvas goes here
      span.edge-word--left   data-luma="portfolio"   "(1995) portfolio"
      button.edge-word--left.edge-word--proxy        invisible click/hover proxy (z 6)
      span.edge-word--right  data-luma="software"    "(2026) software" + italic "coming soon"
      span.edge-word--top    data-luma="wordmark"    "kai.house" + role line
      button.edge-word--top.edge-word--roleproxy     click to cycle role
      WhiteIntro (only when reopened)
      .powerdown-black (when arriving via #powerdown)
      .loading (bar + %)
  .overlay  (settings + sound buttons, blackcut)
  .suite    (MacBook panel)
```
The text sits at `z-index 1`, **behind** the transparent canvas (z 2), so the room can occlude the labels; invisible proxy buttons at z 6 receive the clicks.

### Edge words
- 14 px, `letter-spacing .35em`, lowercase, `#2d2b28`; year line 13 px bold `#6b6760` `.25em`; role/sub 11 px `#8a867f` (sub is italic, `.2em`).
- Left/right: `top 50%`, `left/right 14%` by default. After load, `kai:room-rect` reports the room's projected screen bounds at the home view and the labels are re-centred in the empty margin (`max(gap/2, 60px)`). If either margin is < 120 px, class `--corners` pins them to the bottom corners (24 px / 18 px + safe-area insets). Top label: centred, `top 24px`.
- Fade in 500 ms after load (`edge-word-in`, 1.6 s). Left label is at 75% opacity until hovered (`is-hot`). All labels hide during CRT mode.
- Roles rotate every 3400 ms with a 450 ms fade-out: `creative technologist` → `art director` → `i <3 post`. Clicking skips ahead (200 ms).
- **Luma probe:** every 20th frame, if the camera or canvas size changed, read three 6×6 pixel patches of the WebGL canvas under each `[data-luma]` element. Luma = Rec.709, transparent pixels count as 0.95 (the page). Hysteresis: "light text" when luma < 0.45, back when > 0.55; "covered" when alpha > 0.5, back when < 0.3. Emits `kai:text-luma {id, light, covered}`. When covered, the proxy button is disabled so the click goes to the 3D scene. A `--lumaflip` class (text `#f2efe9`) exists in CSS for dark backgrounds.

### Loading
Centred 180 × 2 px bar (`#f2efe926` track, `#f2efe9` fill, `scaleX` transition 0.3 s) with a 12 px percentage below; fades out over 0.6 s. Note: these colours are near-white on a near-white page, so it is barely visible — pick darker values.

### WhiteIntro (settings button reopens it; **off by default**)
Full white overlay, click anywhere or "skip ×" to dismiss. Three centred messages cross-fading (0.8 s): line 1 → line 2 after 2600 ms each → signature (name 30 px/500/.06em + role 11 px uppercase .26em) for 2200 ms → fade out 1.1 s. 2 px progress bar along the bottom while assets load. Respects `prefers-reduced-motion` (900 ms steps, 0.3 s fades).

### Overlay buttons
`.settings` and `.sound`: 18 px stroked SVG icons (stroke 1.6), colour `#2d2b2859` → `#2d2b28d9` on hover; `top: clamp(14px,3vh,28px)`, `right: clamp(16px,3vw,32px)` (settings sits 34 px further left). Sound icon swaps its two arcs for an × when muted and emits `kai:mute {muted}`.

The stylesheet still contains an objects list (left), pages nav (bottom), a mobile `+` toggle and a confirm dialog, with an idle-hide after 5 s of no input — but those elements are compiled out of the current template. Skip them.

### Suite panel
Fixed, centred, `width: min(430px, 100%)`, `background #0a0a0a61`, `backdrop-filter: blur(16px) saturate(120%)`, border `1px solid hsla(40,26%,93%,.14)`, radius 12, `box-shadow: inset 0 1px #f2efe912`, padding `30px 32px 24px`, opacity fade 0.4 s. Kicker 10 px uppercase `.24em`; title 20 px/500; rows with name 14 px/500, blurb 12 px at 60% opacity, status 10 px uppercase `.14em`; hairline dividers; faint footer line.

### Colour tokens
```
page gradient   #ffffff → #f1eee8 (55%) → #dcd7cf
ink             #2d2b28      muted ink  #6b6760 / #8a867f
paper (on dark) #f2efe9      accent     #ffd60a
black           #010101 / #000
hairline        hsla(40, 26%, 93%, .14)
```

---

## 11. Event bus (`window` CustomEvents)

| Event | Detail | Fired by → heard by |
|---|---|---|
| `kai:hover` | `{id:'computer', hovered}` | Interactions → overlay |
| `kai:computer-activate` | — | Interactions, left label → CRTMode |
| `kai:macbook-activate` | — | Interactions → SuiteMode |
| `kai:tv-toggle` | — | Interactions → TVMode |
| `kai:door-toggle` | — | (nothing fires it now) → Door |
| `kai:crtmode` | `{phase}` | CRTMode → labels, overlay, audio |
| `kai:crt-screen-on` | — | CRTMode → win95live reset |
| `kai:tvmode` | `{active}` | TVMode → overlay |
| `kai:suite` / `kai:suite-close` | `{active}` / — | SuiteMode ↔ SuiteOverlay |
| `kai:zoom` | `{zoomedIn}` | Navigation → overlay |
| `kai:mute` | `{muted}` | sound button → RoomAudio |
| `kai:text-luma` | `{id, light, covered}` | LumaProbe → labels |
| `kai:room-rect` | `{left,right,top,bottom,viewportWidth,viewportHeight}` | RoomRect → labels |
| `kai:intro-open` | — | settings button → RoomExperience |
| `kai:powerdown-arrive` | — | page load with `#powerdown` → CRTMode (also sets `window.__KAI_POWERDOWN_ARRIVE__` in case the listener is not ready yet) |
| `kai:shutdown` | — | (portfolio app) Home icon → ShutdownDialog |

---

## 12. The Win95 portfolio (`/portfolio`)

A separate DOM app — real HTML windows, not canvas. See `kai-house-reference/win95-portfolio-1600x900.png`.

**Stack:** Nuxt 3 + Pinia (stores: `windows`, `filesystem`, `mail`, `audio`), `interact.js` for drag/resize, `moment` for the clock, `html-to-image` for a "export window as PNG" feature. Font: bundled `MS Sans Serif` TTF, `VT323` for terminal bits. Desktop `#008080`, chrome `#c0c0c0`, title bar `#000080`.

**Boot flow**
- Normal entry shows `BiosSplash`: a typed greeting ("hello world, press any key to start… ‑name / role", 100 ms per char, loops after 5 s) and a "press 2 for fast boot" button. Any key/click starts the same three-phase BIOS sequence as the room's CRT (DOM version), with hard-drive loop and beep, then the Win95 startup chime (0.3).
- `?boot=skip` (how the room arrives): no splash, desktop immediately, the chat window auto-opens, chime plays on first gesture if audio is blocked.
- First visit shows a 5-step "Setup Wizard" tutorial (stored as `localStorage.hasSeenTutorial`); a pink "Tutorial" button top-right reopens it.

**Window system** — one store entry per window:
```js
{ windowId, windowState: 'open'|'minimize'|'close', displayName, topbarName,
  windowComponent: 'window'|'FileExplorer'|…, windowContent: '<content component key>',
  windowContentPadding, positionX, positionY ('center' supported), iconImage,
  fullscreen, showInAppGrid (desktop icon), showInStartMenu, showInNavbar (taskbar) }
```
Actions: `setWindowState`, `zIndexIncrement` (global counter written to the element's style), `activateTopmost`, `setFullscreen`, `centerWindow`. The root renders every open window as `<component :is="frame"><component :is="content"/></component>`.

**Desktop:** icons in a left column at 75 px pitch; a draggable README icon in the centre; rubber-band selection box; taskbar with Start, open-window buttons, screenshot toggle, speaker, clock. Click-down / click-release sounds on every mouse press.

**Apps (content components):** chat assistant, Documents (file explorer of case studies), a video-editor-styled player with its own splash screen (project reel; "Read More" opens the case study), an Instagram-styled grid of social edits, one case-study window per project (12), README (Word-styled bio), Mail (contact form posting to a Google Form), Paint, Spotify, Minecraft, an embedded game iframe, and "Home".

**Chat assistant endpoint**
- `POST /portfolio/api/claude95` with `{ session: uuid, messages: [{role, content}] }` → **streamed plain text** body; response header `X-Claude95-Id`; `429` with `{error}` when rate-limited.
- The model can emit tokens like `[[open:WindowId]]`; the client strips them from the text and renders up to 3 "open" buttons that launch those windows. `POST …/click` logs which were clicked.
- Three suggestion chips on the empty state; status bar "Ready / … is typing…" and a message count.

**Return trip:** Home icon → `kai:shutdown` → "Are you sure you want to shut down your computer?" Yes/No (Enter/Esc) → black screen → after 700 ms `location.href = '/#powerdown'`.

---

## 13. Build plan

Target here: this repo (Astro 5, static, `gsap` installed, single empty `src/pages/index.astro`). Vue/Nuxt is not required — the room is plain Three.js classes plus a little DOM. Recommended: Astro page + vanilla TS modules; `three` and `normalize-wheel` as the only new runtime deps.

### 13.1 Suggested layout
```
public/
  draco/                       # copy from three/examples/jsm/libs/draco/gltf
  assets/*.glb, baked-*.jpg, roomba-path.json, audio/, screens/
src/
  pages/index.astro            # gradient shell, labels, buttons, <div id="room">
  pages/portfolio/…            # the "inside the computer" destination
  room/
    Experience.ts  assets.ts
    utils/ EventEmitter.ts Time.ts Sizes.ts Loader.ts Resources.ts easing.ts
    Camera.ts  Renderer.ts  Navigation.ts
    world/ World.ts Model.ts Door.ts ChairTop.ts Roomba.ts CoffeeSteam.ts Interactions.ts
           Screens.ts  screens/{Win95Live,MacScreen,Whiteboard,BiosBoot}.ts
    modes/ screenGeo.ts CRTMode.ts TVMode.ts SuiteMode.ts LightsOut.ts
    LumaProbe.ts  RoomRect.ts  RoomAudio.ts
  ui/ labels.ts overlay.ts suite.ts loading.ts
blender/
  room.blend  bake_pipeline.py  export_glb.py  export_path.py
```

### 13.2 The 3D asset pipeline (the real work — nothing ships without it)

1. **Model** the room in Blender at roughly this scale (≈ 9 × 9 × 5.7 units, floor near y = 0.3 in three.js space, two walls on −x / −z). Light it with real lights + emissive screens for a Cycles render.
2. **Group** objects into bake sets and join each set into one mesh: shell, workstation, living area, wall decor, CRT, laptop, plus one per moving object (door with origin on the hinge, chair top with origin on the swivel axis, roomba with origin at its centre).
3. **UV:** one non-overlapping unwrap per set in **UV slot 0** (Smart UV Project with a small island margin is what these atlases look like). Give big/near sets 4096², small props 256–1024².
4. **Bake** Cycles "Combined" to one image per set, denoise, save as sRGB JPG (quality ~85–90). Script it so a rebake is one command (`blender --background room.blend --python bake_pipeline.py`).
5. **Screens:** separate flat/curved meshes named `screenCRT`, `screenTV`, `screenMacbook`, `screenWhiteboard`, each with a clean 0–1 UV; exclude them from bakes (or bake them black) and export them together as `screens.glb`.
6. **Export** each set as GLB: apply modifiers, **no materials, no images**, Draco on, +Y up, keep object transforms.
7. **Roomba path:** draw a polyline on the floor, export vertex positions (converted to three.js axes) to `roomba-path.json`.
8. **Steam:** a subdivided plane above the mug (≈ 0.28 × 0.5, 24 × 48 segments), UV v = 0 at the mug.

Budget to aim for: ≤ 4 MB GLB + ≤ 6 MB textures. Cheaper than the reference: decimate hidden geometry (173k triangles for a chair is excessive), and use WebP/KTX2 for the bakes.

### 13.3 Code phases (each ends in something visible)

| # | Build | Done when |
|---|---|---|
| 1 | Shell: gradient page, transparent renderer, camera (fov rule), Time/Sizes/Resources, clay fallback material + lights, a placeholder box room | A lit grey box sits on the gradient at the home angle on desktop and portrait |
| 2 | Navigation: orbit/pan/zoom with limits, smoothing, double-click reset, touch | Feels identical with mouse and touch; cannot orbit behind the walls |
| 3 | Real GLBs + baked materials, loading bar | Room matches the Blender render; no lights in the scene |
| 4 | Ambient life: chair, roomba path, steam shader | All three run; roomba eases at corners |
| 5 | Screens: video TV, whiteboard, one scripted canvas screen | Screens are sharp, upright, and animate without dropping frames |
| 6 | Interactions: hull hover, click-vs-drag, priority chain, event bus | Hover cursor only over the computer; dragging never triggers a click |
| 7 | CRT mode + BIOS canvas + lights-out + navigation, and `#powerdown` arrival | Full round trip room → destination → room with no flash of unstyled content |
| 8 | TV mode (composer + bokeh + background swap) and laptop mode + panel | Enter/exit return the camera to exactly where it was |
| 9 | HTML labels, room-rect placement, luma probe, role rotation, buttons | Labels centre in the margins at any window size and fall to corners when narrow |
| 10 | Audio graph: room tone, spatial roomba, TV chain, mute, duck, tab-away suspend | Nothing plays before a gesture; panning follows the orbit |
| 11 | Destination app (`/portfolio`): desktop, window manager, content | — |
| 12 | Polish: reduced-motion, WebGL-unavailable fallback, context-loss handling, dispose on teardown, asset compression | Lighthouse + real phone test |

### 13.4 Things worth doing better than the reference
- Loading indicator is invisible (white on white); intro is disabled.
- 9 MB blocks first paint; no progressive reveal. Load shell + bakes first, heavy props after.
- JS Draco decoder is forced; the WASM one is faster.
- A 3.3 MB 4096 px wallpaper feeds a ~1024 px laptop canvas.
- No `<noscript>`/no-WebGL fallback, no meta description or OG tags on the room page, and `user-scalable=no` hurts accessibility.
- No keyboard path to the three interactions other than the left label button.

---

## 14. Decisions needed before building

1. **The room** — whose room, what objects, day or night bake. Someone has to model it in Blender (not installed on this machine). Options: model it yourself, commission it, or start from a purchased/CC0 kit and re-light it.
2. **What is "inside the computer"** — a full retro desktop like this one is a second project of similar size to the room. A lighter destination (existing portfolio pages) keeps the CRT transition and saves weeks.
3. **Hot spots** — which 2–3 objects are clickable and what each opens.
4. **Content** — project list, video hosting (reference uses a separate bucket for 100 MB+ files), copy for labels and roles.
5. **Chat assistant** — optional; needs a serverless function, an API key and rate limiting.

---

## Corrections to v1

| v1 said | Actually |
|---|---|
| Clicking the MacBook opens the Win95 desktop | The **CRT** does. The MacBook opens a software-downloads panel |
| Win95 desktop is rendered on a canvas texture inside the room | The room only shows a scripted *preview* on the CRT; the real desktop is a separate DOM app at `/portfolio` reached by page navigation |
| Camera look-around follows mouse movement | Drag-to-orbit on a clamped spherical rig with pan, zoom and reset |
| Tone.js for synthesized UI sounds | No Tone.js. Raw Web Audio; no UI sounds in the room |
| ACES tone mapping, HDR environment map, always-on post-processing, KTX2 textures | No tone mapping, no env map, composer only in TV mode, plain JPG bakes |
| Retro TV is clickable and plays video; workStation click shows work | The wall TV (`screenTV`) and remote toggle TV mode; `retro` is the CRT body; workStation is not interactive |
| Door toggles on click | Implemented but disabled |
| State machine `idle/entering/exiting/powering/expanded/dwell` | Three independent mode machines (CRT: 12 phases; TV and Suite: idle/entering/active/exiting); `dwell` belongs to the fake-cursor screens |
| Objects panel, pages nav, yellow hover list in the HUD | CSS leftovers; not rendered. Only settings + sound buttons and three edge labels exist |
| White intro shown before entering | Off by default; only via the settings button |
