You are continuing unattended development of the Bridge project (a 3D-room portfolio). Nobody is watching this run, so never ask questions; make the sensible choice and record it.

1. Read `auto-dev/HANDOFF.md` (detailed instructions for every remaining step) and `auto-dev/PROGRESS.md` (what is done and what is next) first.
2. Read only the sections of `KAI-HOUSE-ANALYSIS.md` you need for the next step (section 13 is the build plan; sections 4-11 hold the exact constants).
3. Do the next unfinished step from PROGRESS.md. Work in small pieces: one phase or one clearly bounded part of a phase per run.
4. Verify with `npm run build`. Fix what you broke before stopping.
5. Update `auto-dev/PROGRESS.md`: tick what is done, write the exact next step, and note any decision you made on the user's behalf.
6. Commit with a clear message (branch `auto-dev`; never push, never touch `main`).

Rules:
- Stay inside this project folder. Do not read or edit `.mcp.json` or anything outside the repo.
- Do not download, copy or hotlink any asset from kai.house or assets.kai.house. Use the placeholder room described in PROGRESS.md until the user supplies their own GLBs.
- Stack: Astro 5 static + plain Three.js in TypeScript modules under `src/room/`, layout as in section 13.1. No Vue.
- Do not start a dev server or any long-running process.
- If every remaining step is blocked on the user (see "Blocked on user" in PROGRESS.md), create the file `auto-dev/STOP`, explain why at the top of PROGRESS.md, and end.
