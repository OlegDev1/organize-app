# Rezhim: personal PWA for sleep, meds and doctor notes

## What
- A personal app for one user (Europe/Madrid). Main device: an Android phone (installed PWA from Chrome). Second: a MacBook (Chrome).
- The UI is in Russian. Code, docs, commits, research and reasoning are in English.
- Messages to the user are in Russian, short and plain.
- `SPEC.md` is the source of truth for behavior. Read it first.
  - If older notes (HANDOFF.md, EDITS.md, project files, old chats) disagree with SPEC.md, SPEC.md wins.
- Built for one person, not for production. Simple and fast beats architecture.

## Ask the user
- Never guess what the user wants. If logic, a screen, wording or a design choice is unclear, ask.
- Ask all open questions at once, as one numbered list.
  - Many points are fine. Keep each question short and plain.
  - Give options or your default where you can.
  - The user answers by voice in one message, so numbers matter.
- Wait for the answers before building that part.
- Don't re-ask what SPEC.md or the chat already answers.
- Decide small technical details yourself (file names, helpers, internal structure).
- After the user answers, add the decisions to the "Decisions" section of SPEC.md, so the next chat knows them.

## How to work
- One agent builds the app.
  - Don't split the work into roles (architect, designer, developer) or agent pipelines.
  - Use helper agents only for independent lookups (e.g. design references), and copy the relevant requirements into their prompt.
- Save tokens:
  - read only what you need, once;
  - don't loop, re-verify or rewrite the same thing;
  - no long research unless the user asks.
- Write as little code as possible.
  - No unused code, no speculative features, no options nobody asked for.
  - No extra layers or abstractions. Delete the code you replace.
- Save progress as you go:
  - after each meaningful chunk, update `PROGRESS.md` (short: done / next / decisions);
  - commit and push to `main`;
  - if `PROGRESS.md` exists, resume from it.
- If the user says «стоп»:
  - stop, commit and push;
  - send 5 lines: what is done, what is left, where you stopped.

## Stack
- Svelte 5 + TypeScript + Vite (official `svelte-ts` template). No SvelteKit, no UI kits, no CSS frameworks.
- Svelte 5 runes only: `$state`, `$derived`, `$effect`, `$props`.
  - Never Svelte 4 syntax: `export let`, `$:`, `on:click` (use `onclick`), `<slot>` (use snippets), `createEventDispatcher` (use callback props).
  - Shared state lives in `*.svelte.ts` modules with `$state`.
- Props: `interface Props { ... }` + `let { a, b }: Props = $props();`.
- `tsconfig`: `"strict": true`. No `any`.
- No dependencies beyond the template. If one is truly needed, it must be very popular, and ask first.
- A few small files split by responsibility. `vite.config.ts`: `base: './'`.
- Run `npx svelte-check` after changes and keep it at 0 errors.

## Deploy and PWA
- GitHub Pages via `.github/workflows/pages.yml` on push to `main` (already in the repo).
  - Pushes that only change `*.md` or `docs/**` don't deploy.
- Site: https://olegdev1.github.io/organize-app/
  - Keep this path: the installed app and the saved data on the phone depend on it.
- PWA:
  - `public/manifest.webmanifest`, `public/icons/`;
  - `public/sw.js`: bump its cache name on every release;
  - it must replace the old service worker caches (`rezhim-v3-*`).

## Data
- Data stays on the device: localStorage (IndexedDB only if truly needed). No servers, no accounts.
- On first load, migrate the old data (format in SPEC.md). Never delete the old keys.

## Tests
- Keep testing light.
  - A few quick checks of the time math (plain asserts in one small script).
  - Then open the site and click through the main screens once.
- No big test suites, no long browser automation. The user tests on the phone and reports bugs.
- Before saying "done": the build passes, the site opens, there are no console errors.

## Privacy and medical
- The repo is public. Never commit personal data: medication names, diagnoses, health details.
- The user enters medication names in the app. They stay on the device.
- The app gives no medical advice. It only follows the user's own rules.

## Platform limits (be honest)
- A website or PWA can't:
  - set alarms in the phone's clock app;
  - ring or notify reliably while it is closed;
  - show undismissable notifications.
- So wake-ups use the phone's own alarms. The app shows which alarms to set.
