# Portfolio rebuild: abioladeyeye.com

## What this project is
A personal portfolio for Abiola Adeyeye, a brand, motion and 3D designer in Lagos.
The layout and interactions are inspired by a Framer template (Foldfolio), read through the Framer MCP.
The final site must look like Abiola's own brand, not a copy of the template.

## Source of truth
* SPEC.md is the plan. Read it before every task.
* Lines in SPEC.md marked **CHANGE:** override what the Framer file shows. Always follow them.
* Lines marked **KEEP:** mean match the Framer file closely.
* If SPEC.md and the Framer file disagree, SPEC.md wins.
* Never copy template photos, placeholder names (Lio Maren), or template copy into the build.

## Stack
* Astro with TypeScript
* Plain CSS with design tokens in `src/styles/tokens.css` (colors, type scale, spacing, radii)
* GSAP with ScrollTrigger for all scroll and motion work
* Deploy target: Vercel (static output)

## How to work
* Build one section or component per task. Never build the whole site in one go.
* Before writing code for a new section, show a short plan and wait for my approval.
* Mobile first. Check desktop, tablet and phone breakpoints for every section.
* Every animation must respect `prefers-reduced-motion`.
* Keep components small and reusable. One component per file.
* Use real semantic HTML (header, main, section, nav, footer) and alt text on images.
* After each finished section, run the dev server, check for errors, and commit with a clear message.
* If something is unclear, ask me. Do not guess on design decisions.

## Pages
Home, Work, Archive, About, Contact, 404, and individual project pages.

## The hard part
The phone component on Home: a closed phone that unfolds on scroll, a lock screen with notifications,
and an incoming call screen with "slide to talk" as the contact CTA.
Build it last, after the rest of the Home page works. Expect several rounds of tuning.
