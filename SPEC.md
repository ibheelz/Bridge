# SPEC — abioladeyeye.com
Source of truth for the portfolio rebuild.
- **KEEP:** = match the Framer template closely
- **CHANGE:** = override with Abiola's brand/content (these win over the template)
- Pages not yet captured from Framer are marked ⚠ TODO — open that page in Framer and append the reading.

---

## Design Tokens

### Colors

| Token | Value | Role |
|---|---|---|
| `/Ink` | `rgb(17, 17, 17)` | Primary text, dark buttons |
| `/Paper` | `rgb(255, 255, 255)` | Page background (light sections) |
| `/Bone` | `rgb(244, 243, 240)` | Warm off-white surface |
| `/Screen` | `rgb(11, 11, 11)` | Dark section background |
| `/Accent/Signal` | `rgb(47, 203, 104)` | Green accent |
| `/Accent/Call` | `rgb(52, 199, 89)` | Green phone-call button |
| `/Accent/Pulse` | `rgb(245, 197, 24)` | Yellow accent |
| `/Device/Titanium` | `rgb(220, 217, 211)` | Device body (default finish) |
| `/Device/Glass` | `rgb(5, 5, 5)` | Device screen bezel |
| `/Device/Edge` | `rgb(166, 162, 155)` | Device frame edge/rail |

KEEP: all color values and names.
CHANGE: swap `rgb(47, 91, 216)` project-card accent (template blue, used inline) with Abiola's accent color (TBD).

### Typography

All display type: **Sofia Sans Extra Condensed** (Google Fonts).
All UI/body type: **Geist** and **Geist Mono** (Google Fonts).
KEEP: both typefaces.

#### Display styles

| Token | Font | Size | Line-height | Letter-spacing | Transform | Tag |
|---|---|---|---|---|---|---|
| `/Display/Giant` | Sofia Sans EC 900 | 300px | 0.8em | −0.01em | uppercase | p |
| `/Display/Giant S` | Sofia Sans EC 900 | 132px | 0.8em | −0.01em | uppercase | p |
| `/Display/Giant M` | Sofia Sans EC 900 | 210px | 0.8em | −0.01em | uppercase | p |
| `/Display/XL White` | Sofia Sans EC 900 | 125px | 0.84em | −0.005em | uppercase | h2 |
| `/Display/Loud White` | Sofia Sans EC 900 | 104px | 0.84em | −0.005em | uppercase | h1 |
| `/Display/Loud Pulse` | Sofia Sans EC 900 | 104px | 0.84em | −0.005em | uppercase | h1 |
| `/Display/Hero Ink` | Sofia Sans EC 900 | 118px | 0.84em | −0.005em | uppercase | h1 |
| `/Display/L White` | Sofia Sans EC 900 | 112px | 0.84em | −0.005em | uppercase | h2 |
| `/Display/Title White` | Sofia Sans EC 900 | 86px | 0.84em | −0.005em | uppercase | h1 |
| `/Display/Title Ink` | Sofia Sans EC 900 | 86px | 0.84em | −0.005em | uppercase | h1 |
| `/Display/M White` | Sofia Sans EC 900 | 73px | 0.84em | −0.005em | uppercase | h3 |
| `/Display/M Ink` | Sofia Sans EC 900 | 73px | 0.84em | −0.005em | uppercase | h3 |
| `/Display/Statement White` | Sofia Sans EC 900 | 70px | 0.86em | −0.005em | uppercase | h2 |
| `/Display/Statement Pulse` | Sofia Sans EC 900 | 70px | 0.86em | −0.005em | uppercase | h2 |
| `/Display/S White` | Sofia Sans EC 900 | 72px | 0.84em | −0.005em | uppercase | h3 (centered) |
| `/Display/Huge Ink` | Sofia Sans EC 900 | 200px | 0.84em | −0.01em | uppercase | h1 (centered) |
| `/Display/Number White` | Sofia Sans EC 900 | 224px | 0.84em | −0.01em | uppercase | p |
| `/Display/Number Ink` | Sofia Sans EC 900 | 224px | 0.84em | −0.01em | uppercase | p |
| `/Display/Number S White` | Sofia Sans EC 900 | 150px | 0.84em | −0.01em | uppercase | p |
| `/Display/Number S Ink` | Sofia Sans EC 900 | 150px | 0.84em | −0.01em | uppercase | p |
| `/Display/404 Ink` | Sofia Sans EC 900 | 150px | 0.84em | −0.01em | uppercase | h1 (centered) |
| `/Display/Stat White` | Sofia Sans EC 900 | 50px | 1em | 0 | uppercase | p |
| `/Display/Card White` | Sofia Sans EC 900 | 30px | 0.9em | 0 | uppercase | h3 |
| `/Display/Card Ink` | Sofia Sans EC 900 | 30px | 0.9em | 0 | uppercase | h3 |
| `/Display/XS White` | Sofia Sans EC 900 | 46px | 0.86em | 0 | uppercase | h3 (centered) |
| `/Display/Clock` | Sofia Sans EC 800 | 132px | 0.9em | −0.01em | none | p (centered) |
| `/Display/Clock Ink` | Sofia Sans EC 800 | 132px | 0.9em | −0.01em | none | p (centered) |
| `/Display/Clock Ink S` | Sofia Sans EC 800 | 76px | 0.9em | −0.01em | none | p (centered) |
| `/Display/Logo` | Sofia Sans EC 900 | 22px | 1em | 0 | uppercase | p |

#### UI styles

| Token | Font | Size | Line-height | Letter-spacing | Transform | Tag |
|---|---|---|---|---|---|---|
| `/UI/Large White` | Geist 500 | 24px | 1.1em | −0.01em | none | p |
| `/UI/Large Ink` | Geist 500 | 24px | 1.1em | −0.01em | none | p |
| `/UI/Lead Ink` | Geist regular | 15px | 1.5em | 0 | none | p |
| `/UI/Body White` | Geist 500 | 13px | 1.3em | 0 | none | p |
| `/UI/Body Ink` | Geist 500 | 13px | 1.3em | 0 | none | p |
| `/UI/Body Muted` | Geist 500 | 13px | 1.3em | 0 | none | p |
| `/UI/Body Ink Center` | Geist 500 | 13px | 1.3em | 0 | none | p (centered) |
| `/UI/Mono White` | Geist Mono 500 | 11px | 1.2em | 0.06em | uppercase | p |
| `/UI/Mono Ink` | Geist Mono 500 | 11px | 1.2em | 0.06em | uppercase | p |

#### Guide styles (canvas annotation only)

| Token | Font | Size |
|---|---|---|
| `/Guide/Label` | Geist 600 | 15px |
| `/Guide/Text` | Geist regular | 15px |

### Spacing & Radii

KEEP all values below.

| Use | Value |
|---|---|
| Page side padding | 29px |
| Nav bar height | 64px |
| Primary button padding | 13px 20px |
| Ghost/secondary button padding | 10px 16px |
| Small pill padding | 9px 14px |
| Button / pill border-radius | 999px |
| Service card border-radius | 14px |
| CTA card border-radius | 18px |
| Notification border-radius | 18px |
| Avatar circle border-radius | 50% |
| Thumb (notification) border-radius | 9px |
| Section heading → content gap | 18px |
| Number grid gap | 28px row, 18px column |
| Service card stack gap | 8px |
| Client chip stack gap | 8px |

---

## Shared Components

### Header component (`fz_CinhEY`)
KEEP: 1fr wide × 64px tall; lives inside the fixed nav bar.
⚠ TODO — read internal structure by focusing the Header component in Framer.

### Nav component (`xvAjRy1qe`)
KEEP: fixed bar — `position: fixed`, 100% wide, 64px tall, `z-index: 10`, transparent bg, centers children horizontally.
Contains one `Header` instance (1fr × 64px).
Variant used on Home canvas: `i_AhKTPQb`.
⚠ TODO — read Nav component internals (logo, links, CTA) by focusing it in Framer.

---

## The Device Component — `FoldfolioDevice`

The central feature. A foldable-phone form factor that contains all page content in its screen.

### Geometry

| | Landscape | Portrait |
|---|---|---|
| Device canvas size | 1000 × 684 px | 380 × 740 px |
| Frame rail (`f`) | 4px | 4px |
| Bezel (`bz`) | 8px | 7px |
| Screen width | 976px | 358px |
| Screen height | 660px | 718px |
| Half-screen | 488 × 660px | 358 × 359px |
| Corner radius | 46px | 42px |
| Thickness (`T`) | 12px | 10px |

KEEP: all geometry values.

### Orientation switching

KEEP: auto mode — switches to portrait when `viewport.width < portraitBelow` prop OR `viewport.width / viewport.height < 0.85`.

### Finishes

KEEP: four built-in finishes — **Titanium** (default, `#DCD9D3`), **Graphite** (`#3A3A3D`), **Coral** (`#EFA38C`), **Sage** (`#C3CBB7`). Custom fifth finish accepts any colour.

Home canvas uses: `finish="titanium"`, `screenColor="rgb(11,11,11)"`.

### Scenes (background mode)

KEEP: three background modes — **Split** (Basic, default), **Glow**, **Orbit**.
Home canvas uses: `scene="split"`, `basicTone="tint"`.
User's choice persists to `localStorage` so it carries across pages.

### Mode: `fold` — Home page only

Scroll drives four sequential phases:
1. **Open phase** (`U1 = openLength × 100vh`): left leaf rotates from 180° → 0° (perspective 2800px). Landscape = `rotateY`, portrait = `rotateX`. Easing: ease-in-out cubic `cubic-bezier(.16,1,.3,1)`. Right half hidden until device is almost open. Left leaf hides when > 90° closed; cover leaf shows when > 90° closed.
2. **Scroll phase** (`innerPx = contentHeight × scale`): content moves up inside the screen via `top` offset (not `transform`, to avoid GPU layer thrashing). Screen motion animations trigger here.
3. **Close phase** (`U2 = closeLength × 100vh`): device refolds. Call screen overlay fades in.
4. **Hold phase** (`U3 = holdLength × 100vh`): device fully closed, call screen fully visible.

KEEP: all phase behaviour and easing.

Idle float: a subtle `sin()` wave (±5px) animates the partially-closed device when the user stops scrolling.

### Mode: `open` — all other pages

KEEP: device appears already fully open. Page scroll moves screen content inside the display, same as the Scroll phase above.

### Screen motion (built-in, applies to content inside the device)

KEEP all. Fires as content scrolls into view:
- **Text nodes**: fade up — `opacity 0→1`, `translateY 14px→0`, 0.55s ease-out, stagger 0.06s between siblings.
- **H1/H2 headings**: rise from clip-path mask.
- **Image frames**: reveal wipe.
- **Frames named "Count…"**: count-up number animation.
- **Hover** (pointer devices only): images inside links scale to 1.06; layers named "Button…" lift `translate(0, -3px)` + brightness; layers named "Row…" slide `translate(10px, 0)`; layers named "Card…" lift `translate(0, -4px)`.
- All animations respect `prefers-reduced-motion: reduce` — motion collapses to instant.

### Page-transition snapshot

KEEP: on navigation, a cloned snapshot of the device fades out over the incoming page to prevent a blank flash between routes.

### Slots

These are the named prop inlets that Framer's canvas wires up:

| Slot name | Size (landscape) | Size (portrait) |
|---|---|---|
| `screen` / `screenPortrait` | 976 × auto | 358 × auto |
| `cover` / `coverPortrait` | 476 × 660 | 358 × 348 |
| `call` / `callPortrait` | 476 × 660 | 358 × 348 |
| `nav` / `navPortrait` | — | — |
| `nameLeft` | fit-content | — |
| `nameRight` | fit-content | — |

KEEP: slot sizes, the landscape/portrait pairing logic (portrait slot takes priority when present).

---

## Page: Home (`/`)

Desktop canvas: 1200px wide, `/Paper` bg, vertical stack, `overflow: clip`.
Tablet canvas: 810px. Phone canvas: 390px.
Both Tablet and Phone are variant breakpoints — ⚠ TODO read their layer trees by focusing them.

### Section: Fixed Nav Bar

KEEP:
- `position: fixed`, `width: 100%`, `height: 64px`, `top: 0`, `z-index: 10`
- `background: transparent` (rgba 0,0,0,0)
- Contains `Header` component (1fr × 64px)
- Horizontal stack, `justify-content: center`, `gap: 10px`

### Section: FoldfolioDevice (entire page below nav)

KEEP:
- `width: 100%`, `height: fit-content`
- `mode: fold`
- `scene: split`
- `basicTone: tint`
- `finish: titanium`
- `screenColor: rgb(11,11,11)`
- `preview: 0` (no static preview in production)

---

## Canvas Slot: Screen (`SlotScreen`, 976 × auto)

This is the content rendered inside the open device on the Home page. Width 976px (landscape), `/Screen` (`rgb(11,11,11)`) outer bg.

---

### Slot-Screen Section 1 — Hero

**Layout:** horizontal stack, wrap on, `/Paper` bg.

**Left panel** — `width: 1fr`, `min-width: 300px`, `height: 660px`, `padding: 76px 29px 100px 29px`

| Element | Content (template) | Style | Notes |
|---|---|---|---|
| Eyebrow | "Art director & photographer — Rotterdam" | `/UI/Mono Ink` | absolute, top 76px left 29px |
| Name | "Lio Maren" | `/Display/Hero Ink` (118px) | full width |
| Tagline | "I make pictures for brands that would rather be felt than explained." | `/UI/Lead Ink` (15px) | max-width 360px |
| CTA group | — | horizontal stack, gap 8px, wrap | — |
| → Primary button | "See the work ↗" → `/work` | `/Ink` bg, `/UI/Body White`, pill radius, padding 13px 20px | — |
| → Ghost button | "Say hello" → `/contact` | `rgba(17,17,17,0.07)` bg, `/UI/Body Ink`, pill radius, padding 13px 20px | — |

CHANGE: replace "Lio Maren" with "Abiola Adeyeye".
CHANGE: replace "Art director & photographer — Rotterdam" with Abiola's discipline/location line.
CHANGE: replace tagline with Abiola's own line.
KEEP: layout, padding, button styles.

**Right panel** — `width: 488px`, `min-width: 300px`, `height: 1fr`
- Portrait photograph, `overflow: visible`

CHANGE: replace template portrait with Abiola's photo.

---

### Slot-Screen Section 2 — Numbers / Stats

**Layout:** `/Ink` bg, `padding: 44px 29px 48px 29px`, vertical stack, gap 18px.

| Element | Content (template) | Style |
|---|---|---|
| Section label | "Twelve years in numbers" | `/UI/Mono White` |
| Grid | — | auto-fill columns, min 190px, gap 28px row / 18px col, 2 rows |
| Each stat — number | e.g. "12" | `/Display/M White` (73px) |
| Each stat — label | e.g. "Years behind the lens" | `/UI/Mono White` |

KEEP: grid layout, `/Ink` bg, spacing, text styles.
CHANGE: replace "Twelve years in numbers" with Abiola's own framing (e.g. years active, projects completed, clients).
CHANGE: replace all stat numbers and labels with Abiola's real data.

---

### Slot-Screen Section 3 — Selected Work Header

**Layout:** `padding: 64px 29px 24px 29px`, horizontal stack, wrap, `align-items: end`, `justify-content: space-between`. Transparent bg (sits on `/Ink` continuation).

| Element | Content | Style |
|---|---|---|
| Heading | "Selected work" | `/Display/L White` (112px) |
| Link pill | "All projects ↗" → `/work` | `rgba(255,255,255,0.1)` bg, `/UI/Body White`, pill radius, padding 10px 16px |

KEEP: all styles.
CHANGE: heading copy may stay "Selected work" — confirm with Abiola.

---

### Slot-Screen Section 4 — Project Cards

**Layout:** vertical stack of project rows, each row is a horizontal wrap.

**Per project row:**
- Image panel: `width: 1fr`, `min-width: 300px`, `height: 600px`, no border-radius.
- Info panel: `width: 1fr`, `min-width: 300px`, `height: 600px`, project colour bg (template uses `rgb(47,91,216)`), `padding: 40px 28px`.

**Info panel layout** — vertical stack, `justify-content: space-between`:

| Element | Content (template) | Style |
|---|---|---|
| Index number (top) | "01" | `/Display/Number White` (224px) |
| Type label (bottom) | "Campaign" | `/UI/Mono White` |
| Title (bottom) | "Red Season" | `/Display/M White` (73px) |
| Description (bottom) | "A spring campaign shot in one colour, one wall and one afternoon." | `/UI/Body White`, max-width 340px |
| Link | "View project ↗" → `/projects/:slug` | `/UI/Mono White` |

KEEP: split image + info panel layout, 600px height, spacing.
CHANGE: replace all project images, titles, descriptions, types and accent colours with Abiola's real projects.
CHANGE: project accent colours — choose per-project from Abiola's palette.

---

### Slot-Screen Section 5 — Services

**Layout:** `padding: 72px 29px 24px 29px`, vertical stack, gap 18px.

| Element | Content (template) | Style |
|---|---|---|
| Section label | "What I do" | `/UI/Mono White` |
| Card list | — | vertical stack, gap 8px |

**Per service card:** `rgba(255,255,255,0.06)` bg, `border-radius: 14px`, `padding: 20px`, horizontal stack wrap, gap 8px row / 18px col.

| Column | Width | Content (template) | Style |
|---|---|---|---|
| Number | 34px fixed | "01" | `/UI/Mono White` |
| Service name | 1fr, min 160px | "Art Direction" | `/Display/Card White` (30px) |
| Description | 1fr, min 220px | "Concept, casting and set design for campaigns that need a point of view." | `/UI/Body White` |

KEEP: card layout, radii, spacing, text styles.
CHANGE: replace section label with Abiola's framing (e.g. "What I do").
CHANGE: replace all service names and descriptions with Abiola's disciplines (Brand, Motion, 3D).

---

### Slot-Screen Section 6 — Clients

**Layout:** `padding: 32px 29px 44px 29px`, vertical stack, gap 16px.

| Element | Content (template) | Style |
|---|---|---|
| Section label | "Trusted by" | `/UI/Mono White` |
| Chip list | — | horizontal stack, wrap, gap 8px |

**Per chip:** `rgba(255,255,255,0.08)` bg, `border-radius: 999px`, `padding: 11px 16px`, `/UI/Body White`.

KEEP: chip style, layout.
CHANGE: replace all client names with Abiola's real client list.

---

### Slot-Screen Section 7 — CTA Card

**Layout:** `padding: 0px 29px 124px 29px` (extra bottom padding for device bezel clearance).

**Card:** `/Paper` bg, `border-radius: 18px`, `padding: 30px 28px`, horizontal stack wrap, gap 18px, `align-items: center`, `justify-content: space-between`.

| Element | Content (template) | Style |
|---|---|---|
| Headline | "Have a brief that needs a pulse?" | `/Display/Card Ink` (30px), `1fr`, min-width 220px |
| CTA button | "Start a project ↗" → `/contact` | `/Ink` bg, `/UI/Body White`, pill radius, padding 13px 20px |

KEEP: card layout, radius, spacing, button style.
CHANGE: replace headline copy with Abiola's own CTA line.

---

## Canvas Slot: Cover / Lock Screen

Two sizes for the two orientations:

### `SlotCoverClosedPhone` — landscape (476 × 660 px)
### `SlotCoverPhone` — portrait (358 × 348 px)

This is the lock screen shown on the closed half of the phone when the device folds shut.

**Outer frame:** `rgb(20,18,16)` (device body colour), `overflow: clip`.

**Inner lock screen:** `rgb(240,242,241)` (warm off-white), `overflow: clip`.

**Layout (landscape version):** vertical stack, `padding: 54px 24px 26px 24px`, gap 6px, `align-items: center`.

| Element | Content (template) | Style | Notes |
|---|---|---|---|
| Portrait photo | Lio Maren portrait | Absolute, height 510px, top 150px, fills full width, `overflow: clip`, aspect 0.933 | Background image layer |
| Clock | "14:32" | `/Display/Clock Ink` (132px, centered) | — |
| Role subtitle | "Art director · Rotterdam" | `/UI/Body Ink` | — |
| Spacer | — | `height: 1fr` | pushes notifications down |
| Notification 1 | "Rosso is live" / "Vela Motors launch film · now" | frosted glass `rgba(255,255,255,0.72)`, radius 18px, padding 9px 12px 9px 9px, → `/work` | Thumb 40×40px, radius 9px |
| Notification 2 | "Sole Study — shortlisted" / "ADC Awards 2026 · 2h ago" | same as above | — |
| Footer | — | horizontal, `justify-content: space-between`, `padding-top: 18px` | — |
| → Instagram | icon → `instagram.com` (new tab) | 48×48px circle, `rgba(255,255,255,0.86)` bg | — |
| → Scroll hint | "Scroll to unfold" | `rgba(255,255,255,0.86)` bg, pill radius, padding 9px 14px, `/UI/Body Ink` | — |
| → X/Twitter | icon → `x.com/liomaren` (new tab) | 48×48px circle, `rgba(255,255,255,0.86)` bg | — |

**Portrait version** (`SlotCoverPhone`, 358×348px): same structure, scaled down.
- Clock: `/Display/Clock Ink S` (76px instead of 132px).
- Only 1 notification (not 2).
- Footer icons 40×40px (not 48px).
- Footer hint padding 8px 12px.

KEEP: all lock screen structure, colours, radii, frosted-glass notifications.
CHANGE: replace portrait photo with Abiola's photo.
CHANGE: replace "Art director · Rotterdam" with Abiola's role/city.
CHANGE: replace notification content with Abiola's real projects/awards (same two-line format: title + timestamp).
CHANGE: replace social links with Abiola's real accounts.

---

## Canvas Slot: Call Screen

Two sizes for the two orientations:

### `SlotCallScreen` — landscape (476 × 660 px)
### `SlotCallPhone` — portrait (358 × 348 px)

The incoming call screen revealed after the phone finishes closing. CTA for contact.

**Outer bg:** `rgb(20,18,16)`.

**Portrait photo:** fills full size, `opacity: 0.38` (landscape aspect 0.721, portrait 1.029), `overflow: clip`.

**UI overlay:** `rgba(0,0,0,0.25)`, full coverage, vertical stack.

**Layout (landscape):** `padding: 72px 26px 30px 26px`, `align-items: center`.

| Element | Content (template) | Style |
|---|---|---|
| Name | "Lio Maren" | `/Display/S White` (72px, centered, uppercase) |
| Subtitle | "Incoming call · about your next project" | `/UI/Body White` |
| Spacer 1 | — | 30px fixed |
| Avatar | Portrait circle | 150×150px, `border-radius: 50%`, `overflow: clip` |
| Spacer 2 | — | `1fr` (pushes slide widget to bottom) |
| Slide to Talk | — | `rgba(255,255,255,0.16)` bg, pill radius 999px, `height: 62px`, `padding: 6px`, → `/contact` |
| → Knob | "✆" | `/Accent/Call` (green) circle 50×50px, `/UI/Large White` (24px) |
| → Label | "slide to talk" | `/UI/Body White`, centered, right-padding 50px |
| Email | "hello@liomaren.studio" | `/UI/Mono White`, centered, top-padding 8px |

**Portrait version** (`SlotCallPhone`, 358×348px):
- Name: `/Display/XS White` (46px instead of 72px).
- Avatar: 84×84px circle.
- Slide to Talk: `height: 52px`, knob 42×42px.
- No email line at bottom.
- Spacer 1: 8px fixed.

KEEP: all call screen structure, slide-to-talk widget, colours, frosted-pill style.
CHANGE: replace "Lio Maren" with "Abiola Adeyeye".
CHANGE: replace email with Abiola's real contact email.
CHANGE: replace avatar photo with Abiola's photo.

---

## Canvas Slot: Name Frames

These slide out from behind the device in the Split scene as it opens/closes. Scale is calculated in the code to fill the available space beside the device.

### `SlotNameLeft`
Content: **"Lio"** — `/Display/Giant` (Sofia Sans EC 900, 300px, `line-height: 0.8em`, uppercase).

### `SlotNameRight`
Content: **"Maren"** — `/Display/Giant` (same style).

KEEP: font, style, size, the outward-slide animation logic.
CHANGE: replace "Lio" / "Maren" with Abiola's first / last name (or chosen split — "Abiola" / "Adeyeye").

---

## Page: Work (`/work`)

⚠ TODO — page could not be read via MCP while Home was focused. To capture:
1. Open the Work page in Framer (click in the canvas Pages panel).
2. Run `getNodeXml` on its Desktop breakpoint node.
3. Append findings here under the same section format used for Home.

---

## Page: Archive (`/archive`)

⚠ TODO — same as Work page above.

---

## Page: About (`/about`)

⚠ TODO — same as Work page above.

---

## Page: Contact (`/contact`)

⚠ TODO — same as Work page above.

---

## Page: 404 (`/404`)

⚠ TODO — same as Work page above.

---

## Page: Project Detail (`/projects/:slug`)

⚠ TODO — same as Work page above.

---

## Breakpoints

| Name | Canvas width | Notes |
|---|---|---|
| Desktop | 1200px | Primary build target |
| Tablet | 810px | Variant; ⚠ TODO read layer tree |
| Phone | 390px | Variant; ⚠ TODO read layer tree |

Device switches from landscape to portrait orientation at `portraitBelow` viewport width or when aspect ratio drops below 0.85. Screen slot widths change: 976px → 358px.

KEEP: all three breakpoints. Build mobile-first.

---

## Interactions & Animations Summary

| Trigger | Element | Behaviour |
|---|---|---|
| Page scroll | FoldfolioDevice (Home, fold mode) | Phase 1: device unfolds. Phase 2: screen content scrolls. Phase 3: device refolds. Phase 4: call screen visible. |
| Page scroll | FoldfolioDevice (all other pages, open mode) | Screen content scrolls inside the open device. |
| Scroll into view | Text nodes in screen | Fade up 0→1 opacity, 14px translateY, 0.55s ease-out, 0.06s stagger |
| Scroll into view | H1/H2 headings | Rise from clip-path mask |
| Scroll into view | Image frames | Reveal wipe |
| Scroll into view | "Count…" frames | Count up from 0 to target number |
| Hover (pointer) | Links with image | Image scales to 1.06 |
| Hover (pointer) | "Button…" layers | `translate(0, -3px)`, brightness(1.08), box-shadow |
| Hover (pointer) | "Row…" layers | `translate(10px, 0)` |
| Hover (pointer) | "Card…" layers | `translate(0, -4px)` |
| Page navigation | Device stage | Snapshot clone fades out over incoming page (prevents blank flash) |
| Idle (fold mode) | Partially-closed device | Subtle sine-wave float ±5px |

KEEP: all interactions.
All scroll/hover animations respect `prefers-reduced-motion: reduce`.
