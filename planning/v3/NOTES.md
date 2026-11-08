# Quiver v3 — findings log

Each thread adds a section before it writes code (§9 rule 3). Evidence comes before fixes.

## P0 — Decisions thread (2026-11-08, repo at `d4aa17d`)

Findings that changed or added decisions, with where each one was checked. The outcomes are in [DECISIONS.md](DECISIONS.md).

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N1 | Without a `<base>` element, `document.baseURI` is the document URL, so `new URL(document.baseURI).pathname` on a deep link returns the deep path (for example `/users/42`), not the app root | HTML spec: a document's base URL falls back to its own URL. `index.html` has no `<base>` | D10 replaced by D22 |
| N2 | A guard that throws leaves the old page in place, and the error surfaces only as a rejected navigation | `src/framework/router.js` `handleNavigate`: `runGuards` is awaited inside `intercept({ handler })` with no try/catch, so `routerState` is never set to `error` | D24 (`onError`, `phase: 'guard'`) |
| N3 | A page function that throws during render has no error view | `src/framework/app.js` `RouteOutlet` calls `Page()` without a try/catch | D24 (`phase: 'render'`) |
| N4 | `routerState` reads `window.location` at import time, which breaks R4 | `src/state/routerState.js`: `path: window.location.pathname \|\| '/'` | D25 |
| N5 | `routerState` is imported outside the framework | `src/components/Link.js`, `src/layouts/MenuLayout.js` | D26: both switch to `useRoute()` |
| N6 | The core falls back to a starter-specific layout name | `router.js`: `layout: meta.layout \|\| 'basic'`. `app.js`: `layouts[...] \|\| layouts.basic` | D28 (`defaultLayout`) |
| N7 | Core mounts a Tailwind-styled wrapper | `app.js`: `` html`<div class="min-h-screen">…` `` | D28 (no wrapper) |
| N8 | The 2.x toast exit hardcodes 200 ms in JS to match the CSS | `src/state/toastState.js` `dismiss()`: `setTimeout(…, 200)`. `src/style.css`: `toast-out 0.2s` | D31 |
| N9 | R7's grep matches planning files and the lockfile | `grep -ril tailwind` (excluding `.git`, `node_modules`) matches `planning/v3/SPEC.md` and `bun.lock` besides the expected 13 files | R7 refined (D34) |
| N10 | `CHANGELOG.md` has no `## [Unreleased]` section | the file goes straight from the header to `## [2.1.0]` | added in this PR |
| N11 | A degit copy of a workspace package that uses `workspace:*` can't install | `workspace:` is a workspace-only protocol, and degit copies only the subfolder | D19 (`^3.0.0` + CI check) |
| N12 | TS consumers get no types from published JSDoc `.js` | TS reads `.js` in `node_modules` only with `allowJs` + `maxNodeModuleJsDepth > 0` | D20 (`.d.ts` at `prepack`) |
| N13 | A `@layer quiver` declared after an app's own layers outranks them | CSS Cascade 5: layer order is first-declaration order, and later layers win | D29 |
| N14 | P7's Done-when can't pass as written: a plain Arrow app has neither the recipes nor the `/add-*` commands | recipes aren't in any published package, and the commands live only in `.claude/commands/` of this repo | D32 |
| N15 | Four Google Fonts are imported over the network, which makes screenshots flaky | `src/style.css` line 1: Audiowide, Orbitron, Space Grotesk, VT323 | D35 (self-host) |
| N16 | The `v2.1.0` tag exists, so the 2.x template stays reachable after the move | `git ls-remote --tags origin` lists `refs/tags/v2.1.0` at `1014c43` | D19 |
| N17 | `jsconfig.json` loads `vite/client` types for all of `src/` | `"types": ["vite/client"]` | D33 (core config leaves them out) |

The 2026-11-06 review evidence (Vite-isms, Tailwind footprint, the Bun 1.4.4 spike, npm names) is in the SPEC.md appendix and was not re-run here. P4 re-verifies the Bun spike.

## Design thread (2026-11-08, repo at `e809fee`)

Read before writing [DESIGN.md](DESIGN.md). The 2.1 app ran on the Vite dev server; computed styles and screenshots were taken with Chromium from Playwright 1.63.0, and compiled CSS was read from Vite's output for `src/style.css` (Tailwind 4.3.3). Scripts were throwaway and are not committed.

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N18 | Retro and brutalist body text never uses VT323 or Space Grotesk | Computed `font-family` on `<html>` is the Inter stack in all 5 themes. `:root { font-family }` (end of `style.css`) and `[data-theme="retro"] { font-family }` are both (0,1,0); the later one wins. VT323 renders only on retro buttons (`[data-theme="retro"] button`, 0,1,1); `document.fonts` shows Orbitron and VT323 loaded in retro, nothing in brutalist | V1; parity port leaves it, F1 fixes |
| N19 | Per-theme shadow tokens never reach the shadow utilities | Compiled `.shadow-panel { --tw-shadow: 0 1px 3px 0 var(--tw-shadow-color, rgb(0 0 0 / 0.1)), … }`: the `@theme` value is inlined. Brutalist metric card computed `box-shadow` ends in `rgba(0,0,0,0.1) 0px 1px 3px 0px`, not `4px 4px 0 0 #000`. Retro cards get `rgb(87,83,78) 2px 2px` only through the retro `.rounded-panel` effect rule | V2; F2 |
| N20 | Brand buttons are unreadable in mono dark, and low contrast in retro dark and brutalist | Counter "Increment" computed `color: rgb(255,255,255)` on `rgb(250,250,250)` in mono dark (screenshot confirms blank label). WCAG contrast of white on brand: mono dark 1.04, retro dark 1.51, brutalist 1.53, default 2.8, glass dark 2.72 | V3; new token `--q-color-on-brand`, F3 |
| N21 | The brutalist sidebar has a 3px border on all four sides | Computed `aside` border widths `3px 3px 3px 3px`, style `solid` (preflight's `border: 0 solid` + `[data-theme="brutalist"] aside { border-width: 3px }`). Other themes: right border only | V4; F4 |
| N22 | Unlayered rules in `style.css` beat every utility | Tailwind's output is in `@layer theme, base, components, utilities`; the effect rules and the `:root`/`button, a, input` base rules are unlayered. Retro buttons compute to 17px VT323 uppercase despite `text-sm`; brutalist panels are 3px despite `theme-brutalist:border-2`; glass panels blur 20px despite `theme-glass:backdrop-blur-md` | Port the computed result (DESIGN §1); sub-layer order (DESIGN §3.1) |
| N23 | Dead declarations with no visible effect | as N22, plus brutalist `-webkit-font-smoothing: auto` on `<html>` (body's `antialiased` wins, computed `antialiased`), and `--font-ui` is never referenced (`grep -rn "font-ui" src` matches only its definition) | V5; not ported |
| N24 | Inter is never loaded; body text uses the OS fallback | The Google Fonts URL loads Audiowide, Orbitron, Space Grotesk and VT323 only; `document.fonts` never lists Inter | V6; fonts pinned by the CI image (DESIGN §8.3) |
| N25 | Google serves Space Grotesk at 700 only, and woff2 latin subsets exist for all four fonts | The `css2` URL in `style.css` returns 200 with Space Grotesk `font-weight: 700` faces only (no 900). Versions served: Audiowide v22, Orbitron v35, Space Grotesk v22, VT323 v18 | P1 self-hosts the latin woff2 of each |
| N26 | Recipe CSS needs a newer Chromium than core | CSS nesting with `&` ships in Chrome 112, `color-mix()` in 111; D11's core floor is Chrome/Edge 102. Safari 26.2 and Firefox 147 support both | P8 docs state both floors |
| N27 | The `--q-*` token port is exact | DESIGN §4.4 `tokens.css` loaded beside 2.1 with `addStyleTag`; for each theme × mode, compared `getComputedStyle(html)` of every `--color-*`, `--radius-*` and `--font-display` with its `--q-*` twin: 220/220 equal | tokens.css in DESIGN §4.4 |
| N28 | Captures are deterministic, and plain CSS can match Tailwind's output exactly | `toHaveScreenshot` on `/` in default-light, glass-dark, retro-light: 30/30 repeat captures with 0 differing pixels at `threshold: 0`. Replacing Tailwind's shadow stack, `color-mix` with `@supports`, and `space-y-10` with plain CSS gave 0 differing pixels. One-change probes: border +1px 8,818 px; padding +1px 8,803 px; border colour `#e2e8f0`→`#dfe7f0` 1,597 px (0 above threshold 0.02); shadow alpha 0.10→0.14 5,056 px (868 above 0.02); h1 letter-spacing +0.01em 116 px (110 above 0.02) | Tolerance proposal (DESIGN §8.5) |
| N29 | Two pages are non-deterministic as they stand | `/posts` fetches `jsonplaceholder.typicode.com` at runtime; user ids are `crypto.randomUUID()` (`src/state/userState.js`), so the profile URL, the header path and the `:id` value change per run | Route mocks and masks (DESIGN §8.2) |
