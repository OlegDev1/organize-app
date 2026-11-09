# Rezhim: personal PWA for sleep, meds, alarms and doctor notes

## What
- A personal app for one user (Europe/Madrid). Main device: a big Android phone (installed PWA from Chrome). Second: a MacBook (Chrome), used to ring the morning alarms.
- The UI is in Russian. Code, docs, commits, research and reasoning are in English.
- Messages to the user are in Russian, short and plain.
- Sources of truth:
  - `README.md`: how the project is built (layout, concepts, deploy, common changes). Read it to find your way fast.
  - `REQUIREMENTS.md`: what the user needs. Read it first. How to build it, which screens and the plan of work: you decide.
  - `USER.md`: personal context. The user attaches it in the chat. It is private: never commit it.
  - If older notes (HANDOFF.md, EDITS.md, Additional_data.md, project files, old chats) disagree with REQUIREMENTS.md, REQUIREMENTS.md wins.
- Built for one person, not for production. Simplicity and speed come before architecture.

## Priorities
1. Correct logic (sleep plan, doses, alarms).
2. A beautiful, polished UI that is clear in 2 seconds. The visuals matter a lot to the user.
3. Fast and smooth: quick load, smooth transitions, small bundle.
- Do the main things right first. The user will adjust details to his taste later.

## Ask the user
- Never guess what the user wants. If logic, a screen, wording or a design choice is unclear, ask.
- Ask all open questions at once, as one numbered list.
  - Many points are fine. Keep each question short and plain.
  - Give options or your default where you can.
  - The user answers by voice in one message, so numbers matter.
- Don't re-ask what REQUIREMENTS.md, USER.md or the chat already answers.
- Decide small technical details yourself (file names, helpers, internal structure).
- After the user answers:
  - write his answers into the "Answers" section of REQUIREMENTS.md, so the next chat knows them;
  - build to the end without stopping for approval, unless you are truly blocked.

## How to work
- One agent builds the app.
  - Don't split the work into roles (architect, designer, developer) or agent pipelines.
  - Use helper agents only for independent lookups (e.g. design references), and copy the relevant requirements into their prompt.
- Save tokens:
  - read only what you need, once;
  - think hard on important decisions, but don't loop or rethink the same decision;
  - don't re-verify or rewrite what already works;
  - no long research unless the user asks.
- Code size: the middle ground.
  - Clean, readable code of normal size. Quality over line count.
  - No boilerplate, no layers, no patterns or abstractions for their own sake, no unused code, no speculative features.
  - Don't squeeze the code to be tiny either.
  - Delete the code you replace.
- Libraries: if something needs non-trivial code (date and time math, animations, icons, gestures), prefer a popular, well-maintained library over writing it yourself.
  - Popular means a standard choice with roughly a million or more weekly downloads.
  - Keep the bundle small. No heavy UI kits, no SvelteKit.
- Save progress as you go:
  - after each meaningful chunk, update `PROGRESS.md` (short: done / next / decisions);
  - commit and push to `main`;
  - if `PROGRESS.md` exists, resume from it.
- If the user says «стоп»:
  - stop, commit and push;
  - send 5 lines: what is done, what is left, where you stopped.

## Stack
- Plain Svelte 5 + TypeScript + Vite (official `svelte-ts` template). No SvelteKit.
- Svelte 5 runes only: `$state`, `$derived`, `$effect`, `$props`.
  - Never Svelte 4 syntax: `export let`, `$:`, `on:click` (use `onclick`), `<slot>` (use snippets), `createEventDispatcher` (use callback props).
  - Shared state lives in `*.svelte.ts` modules with `$state`. No stores unless truly needed.
- Props: `interface Props { ... }` + `let { a, b }: Props = $props();`.
- `tsconfig`: `"strict": true`. No `any` (use `unknown` + narrowing).
- `vite.config.ts`: `base: './'`.
- Run `npx svelte-check` and keep it at 0 errors. Fix errors; don't chase warnings endlessly.

## Deploy and PWA
- GitHub Pages via `.github/workflows/pages.yml` on push to `main` (already in the repo).
  - Pushes that only change `*.md` or `docs/**` don't deploy.
- Site: https://olegdev1.github.io/organize-app/
  - Keep this path: the app is installed on the phone from it.
- PWA:
  - `public/manifest.webmanifest`, `public/icons/`;
  - `public/sw.js`: bump its cache name on every release;
  - it must replace the old service worker caches (`rezhim-v3-*`), so the phone gets the new app.

## Data
- Fresh start: no migration of old data.
  - Use a new localStorage key (e.g. `rezhim-v4`). Ignore the old keys and don't delete them.
- Data stays on the device: localStorage (IndexedDB only if truly needed). No servers, no accounts.
- The phone and the Mac are not synced. Design for that.

## Checks (one pass, not loops)
- Tests: tiny or none.
  - A few plain asserts for the time math are fine.
  - If you build the Mac alarm series, check its timing once in headless Chrome with a fake clock (Playwright `page.clock`).
- At the end of the build, check your work once:
  - the build passes and `svelte-check` shows 0 errors;
  - the site opens and there are no console errors;
  - look at screenshots of the main screens at 360 px and on a desktop width: is it clear, beautiful, without overflow?
  - the logic matches REQUIREMENTS.md.
- Fix what's wrong, then stop. Don't re-check what already passed. The user tests on the phone and sends fixes.

## Privacy and medical
- The repo is public. Never commit personal data: medication names, diagnoses, health details, USER.md.
- The user enters medication names in the app. They stay on the device.
- The app gives no medical advice. It only follows the user's own rules. He agrees timing changes with his doctor.

## Platform limits (be honest)
- A website or PWA can't:
  - set alarms in the phone's clock app;
  - show undismissable notifications or draw over other apps;
  - choose system notification sounds;
  - ring or notify reliably while it is closed (no server).
- A browser alarm (on the Mac) rings only if all of these hold:
  - the tab stays alive (Chrome Memory Saver is on: the site must be in "Always keep these sites active");
  - the machine is awake (Wake Lock, plus the anti-sleep app on the Mac);
  - audio was unlocked by a tap.
- So phone wake-ups use the phone's own alarms. The app shows which ones to set.
