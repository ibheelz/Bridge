# Prompts to paste into Claude Code, in order

Keep the Framer MCP plugin open in Framer the whole time.

## Phase 1: Extract the spec (no code)

```
Using the Framer MCP, read every page of my open Framer project: Home, work, archive,
about, contact, 404 and the projects folder. Also read the component slots on the canvas
(Screen, Cover, Call screen, Cover Phone, Call Phone, Name Left, Name Right).

Write everything into SPEC.md. For each page and section list: layout, content, fonts,
font sizes, colors, spacing, breakpoints, and any interactions or animations.
Put the shared colors, fonts and spacing at the top as a "Design tokens" section.
Mark every item with KEEP: by default. Do not write any code yet.
```

## Phase 2: You edit SPEC.md (no Claude)

Open SPEC.md and change anything you want. Write **CHANGE:** in front of every line you change.
Swap in your own fonts, colors, name, stats, work, and copy. This is where your changes are cheap.

## Phase 3: Set up the project

```
Read CLAUDE.md and SPEC.md. Set up the Astro project with TypeScript and GSAP.
Create tokens.css from the Design tokens section of SPEC.md, a base layout,
and empty pages for every route. No animations yet. Show me the plan first.
```

## Phase 4: Build section by section

Repeat this for each section, top to bottom:

```
Build the [SECTION NAME] section of the Home page from SPEC.md.
Follow every CHANGE: line. Show me the plan first, then build it,
check all breakpoints, and commit.
```

## Phase 5: The phone

```
Now build the phone component from SPEC.md: closed phone, unfold on scroll,
lock screen with notifications, and the incoming call screen with slide to talk.
Use GSAP ScrollTrigger. Start with the static states only, no animation.
```

Then, once the static states look right:

```
Animate the phone unfold on scroll. Keep it smooth on phones and respect reduced motion.
```

## When you change your mind later

```
I updated SPEC.md. Compare it with what is built and list what needs to change.
Do not change anything until I approve.
```
