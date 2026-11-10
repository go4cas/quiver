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

## Architecture thread (2026-11-08, repo at `e809fee`)

Findings behind [TECH-SPEC.md](TECH-SPEC.md). Spikes ran in a scratch folder with Bun 1.4.4, Node 22.23 and TypeScript 7.0.2; nothing in the repo changed.

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N18 | Bun links a `^3.0.0` dependency to a workspace package only when the workspace version satisfies the range. A prerelease (`3.0.0-alpha.0`) makes `bun install` go to npm and fail | scratch workspace: `3.0.0` → `bun.lock` has `"@x/core@workspace:packages/core"`; `3.0.0-alpha.0` → `GET https://registry.npmjs.org/@x%2fcore - 404`, `failed to resolve` | X-12: core is `3.0.0` from P2 |
| N19 | Typechecking `node:` imports under `checkJs` needs `@types/node`, which the repo doesn't have | `tsc --checkJs --strict --types ''` on a file importing `node:fs/promises`: `TS2591: Cannot find name 'node:fs/promises'`. `node_modules/@types/` has no `node` | Q-A in TECH-SPEC |
| N20 | `scoreRoute` has ties, so with key order irrelevant (D21) the match order is undefined | `scoreRoute('/a/:b') === scoreRoute('/:a/b') === 11`; both match `/a/b` | M-6 tie-break, M-4 |
| N21 | 2.x `go()` and guard redirects drop the query and hash | `router.js`: `go` calls `navigate(normalizePath(path))`; the redirect branch calls `navigate(normalizePath(result))`; `normalizePath` strips `?…` and `#…` | C-30, C-32 |
| N22 | 2.x intercepts form POST and download navigations | `handleNavigate` checks only `canIntercept`, `hashChange` and `info.rollback`, not `formData` or `downloadRequest` | §2 step 1 |
| N23 | 2.x caps redirects only on the initial load | `initRouter` loops at most 10 times; `handleNavigate`'s redirect branch has no counter | C-27 |
| N24 | `recipes/` at the repo root can't be listed in the core package's `files` | npm `files` entries are relative to the package folder | X-10: `prepack` copies it in |
| N25 | 2.x silently drops `not-found.js` files below the pages root | `resolveRoute`: `!r.file.endsWith('/not-found.js')` excludes them; only `../pages/not-found.js` is used | S-3 |
| N26 | TS 7.0.2 emits clean `.d.ts` from the 2.x JSDoc, so D20 works as written | `tsc --allowJs --declaration --emitDeclarationOnly` on `src/framework/context.js` and `meta.js` produced typed declarations, including the `@template` on `inject` | X-11 |
| N27 | `bun run --filter '*' <script>` skips workspaces without the script and runs dependents after their dependencies | scratch workspace: the package without `test` was skipped; `@x/core` ran before the starter that depends on it; exit 0 | W-2 |
| N28 | `initRouter` resolves before `createApp` mounts, so the initial navigation has no error view to show when it fails | 2.x `main.js`: `await initRouter()` then `createApp()` | C-44 |
| N29 | Render errors can only be caught inside the outlet's reactive slot, where `Page()` and `Layout()` are called | `app.js` `RouteOutlet` | C-48 |
| N30 | Arrow 1.0.6 has no public unmount; `onCleanup` callbacks run only when Arrow drops a chunk | `dist/index.d.ts` exports `html, svg, reactive, watch, component, onCleanup, nextTick, pick`; `onCleanup` throws `'onCleanup needs component'` outside one | C-49 step 6, C-50 |
| N31 | Playwright resolves `page.goto('/x')` against the origin, so a sub-path `baseURL` is lost unless tests use relative URLs | URL resolution: `new URL('/x', 'http://h/sub/app/')` is `http://h/x` | CI-3 |

## Design thread (2026-11-08, repo at `e809fee`)

Read before writing [DESIGN.md](DESIGN.md). The 2.1 app ran on the Vite dev server; computed styles and screenshots were taken with Chromium from Playwright 1.63.0, and compiled CSS was read from Vite's output for `src/style.css` (Tailwind 4.3.3). Scripts were throwaway and are not committed.

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N32 | Retro and brutalist body text never uses VT323 or Space Grotesk | Computed `font-family` on `<html>` is the Inter stack in all 5 themes. `:root { font-family }` (end of `style.css`) and `[data-theme="retro"] { font-family }` are both (0,1,0); the later one wins. VT323 renders only on retro buttons (`[data-theme="retro"] button`, 0,1,1); `document.fonts` shows Orbitron and VT323 loaded in retro, nothing in brutalist | V1; parity port leaves it, F1 fixes |
| N33 | Per-theme shadow tokens never reach the shadow utilities | Compiled `.shadow-panel { --tw-shadow: 0 1px 3px 0 var(--tw-shadow-color, rgb(0 0 0 / 0.1)), … }`: the `@theme` value is inlined. Brutalist metric card computed `box-shadow` ends in `rgba(0,0,0,0.1) 0px 1px 3px 0px`, not `4px 4px 0 0 #000`. Retro cards get `rgb(87,83,78) 2px 2px` only through the retro `.rounded-panel` effect rule | V2; F2 |
| N34 | Brand buttons are unreadable in mono dark, and low contrast in retro dark and brutalist | Counter "Increment" computed `color: rgb(255,255,255)` on `rgb(250,250,250)` in mono dark (screenshot confirms blank label). WCAG contrast of white on brand: mono dark 1.04, retro dark 1.51, brutalist 1.53, default 2.8, glass dark 2.72 | V3; new token `--q-color-on-brand`, F3 |
| N35 | The brutalist sidebar has a 3px border on all four sides | Computed `aside` border widths `3px 3px 3px 3px`, style `solid` (preflight's `border: 0 solid` + `[data-theme="brutalist"] aside { border-width: 3px }`). Other themes: right border only | V4; F4 |
| N36 | Unlayered rules in `style.css` beat every utility | Tailwind's output is in `@layer theme, base, components, utilities`; the effect rules and the `:root`/`button, a, input` base rules are unlayered. Retro buttons compute to 17px VT323 uppercase despite `text-sm`; brutalist panels are 3px despite `theme-brutalist:border-2`; glass panels blur 20px despite `theme-glass:backdrop-blur-md` | Port the computed result (DESIGN §1); sub-layer order (DESIGN §3.1) |
| N37 | Dead declarations with no visible effect | as N22, plus brutalist `-webkit-font-smoothing: auto` on `<html>` (body's `antialiased` wins, computed `antialiased`), and `--font-ui` is never referenced (`grep -rn "font-ui" src` matches only its definition) | V5; not ported |
| N38 | Inter is never loaded; body text uses the OS fallback | The Google Fonts URL loads Audiowide, Orbitron, Space Grotesk and VT323 only; `document.fonts` never lists Inter | V6; fonts pinned by the CI image (DESIGN §8.3) |
| N39 | Google serves Space Grotesk at 700 only, and woff2 latin subsets exist for all four fonts | The `css2` URL in `style.css` returns 200 with Space Grotesk `font-weight: 700` faces only (no 900). Versions served: Audiowide v22, Orbitron v35, Space Grotesk v22, VT323 v18 | P1 self-hosts the latin woff2 of each |
| N40 | Recipe CSS needs a newer Chromium than core | CSS nesting with `&` ships in Chrome 112, `color-mix()` in 111; D11's core floor is Chrome/Edge 102. Safari 26.2 and Firefox 147 support both | P8 docs state both floors |
| N41 | The `--q-*` token port is exact | DESIGN §4.4 `tokens.css` loaded beside 2.1 with `addStyleTag`; for each theme × mode, compared `getComputedStyle(html)` of every `--color-*`, `--radius-*` and `--font-display` with its `--q-*` twin: 220/220 equal | tokens.css in DESIGN §4.4 |
| N42 | Captures are deterministic, and plain CSS can match Tailwind's output exactly | `toHaveScreenshot` on `/` in default-light, glass-dark, retro-light: 30/30 repeat captures with 0 differing pixels at `threshold: 0`. Replacing Tailwind's shadow stack, `color-mix` with `@supports`, and `space-y-10` with plain CSS gave 0 differing pixels. One-change probes: border +1px 8,818 px; padding +1px 8,803 px; border colour `#e2e8f0`→`#dfe7f0` 1,597 px (0 above threshold 0.02); shadow alpha 0.10→0.14 5,056 px (868 above 0.02); h1 letter-spacing +0.01em 116 px (110 above 0.02) | Tolerance proposal (DESIGN §8.5) |
| N43 | Two pages are non-deterministic as they stand | `/posts` fetches `jsonplaceholder.typicode.com` at runtime; user ids are `crypto.randomUUID()` (`src/state/userState.js`), so the profile URL, the header path and the `:id` value change per run | Route mocks and masks (DESIGN §8.2) |

## P1 build thread (2026-11-09, repo at `394a51b`)

Read before writing the port. Captures ran in `mcr.microsoft.com/playwright:v1.63.0-noble` (locally under Docker, and in CI), Chromium from Playwright 1.63.0.

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N44 | `workflow_dispatch` works on the P1 branch even though `main`'s `test.yml` has no such trigger: GitHub registers the workflow by file from `main` and reads the trigger and jobs from the dispatched ref | Dispatch on `claude/project-thread-xv5sqp` ran (run 42583797191) and the job committed the baseline as `352671c` | Baseline captured on CI as D35 asks, no push to `main` |
| N45 | A local Docker run of the pinned image reproduces CI's captures exactly | Local baseline vs CI baseline: 190/190 pixel-identical (`PIL.ImageChops.difference(...).getbbox()` is `None`); 10 files differ only in PNG bytes | Local Docker is a safe way to iterate; `tests/visual/README.md` documents the command |
| N46 | Mobile full-page captures carry sub-threshold noise even with unchanged CSS. DESIGN's 30/30 determinism probe covered desktop `/` only | Untouched 2.1 code at `threshold: 0`, `maxDiffPixels: 0` against its own CI baseline: 15 of 20 mobile dashboard/team captures fail, at most 29 px, max channel delta 22, all in the header row (theme swatches and mode toggle) | The approved tolerance absorbs it (all pass at 0.02 / 0.0001). The update path uses `--update-snapshots=changed`, so noise never rewrites PNGs |
| N47 | The parity port matches 2.1 | 190/190 pass at the approved tolerance, locally and on CI (run 42585364839 at `6ebf1bb`, baseline unchanged). At `threshold: 0`, 24 captures differ by at most 29 px, in the same header region or with a channel delta of 1 (N46) | P1 Done-when item 1 |
| N48 | `jsonplaceholder.typicode.com` is blocked from the build container (HTTP 403 through the proxy) | `curl https://jsonplaceholder.typicode.com/posts` → 403 | `tests/visual/fixtures/posts.json` is the first 12 posts of `data.json` in the `typicode/jsonplaceholder` repo, the data the API serves |
| N49 | `oven-sh/setup-bun` needs `unzip`, which the Playwright image lacks | `docker run … playwright:v1.63.0-noble which unzip` prints nothing | The `screenshots` job installs it with `apt-get` first |
| N50 | Core's `min-h-screen` wrapper (N7) has no visible effect: every layout and view sets its own `min-height: 100vh` | Dropping the class leaves all 190 captures within tolerance | P1 keeps the bare `<div>` wrapper; P3 removes it (D28) |
| N51 | A file-content grep for the R7 word can't contain the word itself | The first `tailwind.test.js` matched its own `describe` text | The test builds the pattern as `'tail' + 'wind'` |

## P2 build thread (2026-11-10, repo at `36284a4`)

Read before moving files. Bun 1.4.4, Node 22.23, TypeScript 7.0.2, Playwright 1.63.0.

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N52 | Core can't be moved as-is: it imports the starter in three places, so "move only" needs a minimal seam | `src/framework/router.js`: `import.meta.glob('../pages/**/*.js')`; `src/framework/app.js`: imports `../layouts/index.js`, `../components/LoadingCard.js`, `../components/ErrorCard.js` | P2 takes the TECH-SPEC option names as that seam: `initRouter({ routes, notFound })` (§1.3, manifest per §3) and `createApp({ target, layouts, defaultLayout, loading, error })` (§1.6). Only the parts 2.x already did are implemented; the error view gets `{ message }` only. P3 adds the rest (base, `retry`, validation, bare unknown-layout render, no wrapper) |
| N53 | `Link` and `MenuLayout` read `routerState` directly (N5), and `routerState` can't be exported from the package (D26, C-2) | `src/components/Link.js`, `src/layouts/MenuLayout.js` | Both switch to `useRoute().path()` now rather than in P3; same reactive read |
| N54 | `fileToRoutePath` has no caller in core once routes come in as a manifest | `router.js` only used it to build `routeRecords` | Moved with its tests to `starter/src/routes.js`, which builds the manifest from `import.meta.glob` until P4's Vite plugin replaces the file. P4's scanner ports the same rules |
| N55 | 2.x falls back to `layouts.basic` in two places | `router.js` `meta.layout \|\| 'basic'`; `app.js` `layouts[…] \|\| layouts.basic` (N6) | Router stores `meta.layout \|\| ''`; `createApp` uses `layouts[layout] \|\| layouts[defaultLayout]`. The starter passes `defaultLayout: 'basic'`, so unknown and missing layouts still render `basic` |
| N56 | The starter can't extend `../jsconfig.base.json` as W-5 says: a degit copy of `starter/` has no parent config, and `tsc` fails on a missing `extends` | W-5 vs D19 (degit target); same reason W-3 gives for the starter listing its own dev tools | `starter/jsconfig.json` is self-contained; `packages/quiver/jsconfig.json` extends the base. Also: `jsconfig.json` files have no comments, so repo tests can `JSON.parse` them |
| N57 | `bun run --filter` uses the root `bunfig.toml` (`[run] bun = true`) in every workspace, but a degit copy of `starter/` has no root | probe script `console.log(typeof Bun)` in `docs/` without its own bunfig → `object` | Only `starter/` gets a copy of `bunfig.toml` |
| N58 | Bun links the starter's `^3.0.0` to the workspace and keeps one hoisted `@arrow-js/core` (R5) | `bun.lock`: `"@go4cas/quiver": ["@go4cas/quiver@workspace:packages/quiver"]`; `node_modules/@go4cas/quiver -> ../../packages/quiver`; the only `@arrow-js/core` is `node_modules/@arrow-js/core`; e2e (which needs core's and the starter's `reactive`/`html` to share one Arrow) passes | X-12 confirmed in the repo |
| N59 | npm (StackBlitz) links the workspace too, but the root `dev` script needs Bun | fresh copy without `bun.lock`: `npm install` → `node_modules/@go4cas/quiver -> ../../packages/quiver`; `npm run dev --workspace=quiver-starter` serves `/src/main.js` importing `packages/quiver/src/index.js` | `.stackblitzrc` runs `npm run dev --workspace=quiver-starter`. Not tried on StackBlitz itself |
| N60 | The new degit path can't install until 3.0.0 is on npm | `starter/package.json` depends on `"@go4cas/quiver": "^3.0.0"`, which isn't published (D19 requires a real range) | README and getting-started lead with `go4cas/quiver/starter` (D19) and say that it installs once 3.0.0 is published, pointing at the repo clone or `go4cas/quiver#v2.1.0` meanwhile. Docs deploy on push to `main`, so this is live after merge |
| N61 | Core's typecheck catches the Vite-isms R1 bans, and W-10 catches a starter import | Temporarily adding `import { layouts } from '../../../starter/src/layouts/index.js'` and `import.meta.glob('./*.js')` to `packages/quiver/src/app.js`: `boundaries.test.js` fails naming the specifier; `tsc -p jsconfig.json` → `TS2339: Property 'glob' does not exist on type 'ImportMeta'` | P2 Done-when items 2 and 3 |

## P3 build thread (2026-11-10, repo at `09c02c3`)

Read before writing the core API. Bun 1.4.4, Arrow 1.0.6, TypeScript 7.0.2, Playwright 1.63.0, jsdom 29. Probes were throwaway Vitest files and are not committed.

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N62 | 2.x core read `window` at import and could not tear down | `state.js` initialised `path: window.location.pathname`; `router.js` had `destroyRouter()` (listener only), guards in a never-cleared array, `_ctx` never cleared | `routerState` starts at `path: ''` and is replaced on `destroy()` (C-50); `destroy()` runs C-49's eight steps. A `node`-environment test imports every `src/` module (C-3) |
| N63 | `reactive()` wraps an `Error` stored in state in a proxy, so the error view would not get the original thrown value | Probe: `error({ error })` received `Object { message }`, not the `Error`, when the outlet read `routerState.error` | Router state stores `error` as a thunk (`() => err`), which Arrow leaves alone like the `page` function; hooks get the value straight from the pipeline |
| N64 | Arrow runs `onCleanup` only for a component that is itself the dropped slot value. A component nested inside a template (a page inside a layout, or any child component) is recycled with its parent chunk and its cleanups never run, on `destroy()` or on navigation | `html.ts` `removeUnmounted`: a chunk with `r === true` (plain template) goes to `recycleChunk`, only `r === false` (component) chunks reach `destroyChunk`, which runs `chunk.u`. Probe: `${() => flag ? C() : ''}` ran C's cleanup when `flag` went false; `${() => flag ? html\`<div>${C()}</div>\` : ''}` and a component wrapping `C()` did not | Accepted by Cas for P3 (2026-11-10, after the PR #27 review). C-49 carries the caveat; C-49 (a) is tested for a page component rendered without a layout. The P8 docs must say that components inside a layout get no `onCleanup`. An upstream Arrow issue is needed; the draft is below this table. It is not filed until Cas says so |
| N65 | A synchronous render error can be written to router state from inside the outlet's render: Arrow re-runs the slot in the same tick | Probe: throwing page → catch sets `status = 'error'` → after one `nextTick()` the target shows the error view, no loop | C-48 as specified; the pipeline waits one more `nextTick()` after a render error so C-26 holds |
| N66 | C-16 keeps 2.x's "a redirect to the current path proceeds" on the initial load, so an always-redirecting guard behaves differently there than in-app | 2.x `initRouter`: `if (next === to) break`; in-app, the same guard hops until C-27's cap | Changed after the PR #27 review (Cas agreed 2026-11-10): in-app now treats a redirect to the current normalised `to` as proceed too, so the cap only catches real cycles. C-16, C-27 and §2 step 3 reworded. Unit test: `guard(() => '/login')` reaches `/login` on a fresh load and in-app with no error. Known edge: a same-path redirect that only changes the query (`'/login?next=x'` while on `/login`) proceeds without applying the query, on both paths |
| N67 | A guard-cancel rollback goes to `url(from)` (C-32), and `from` is normalised, so cancelling drops the previous URL's query and hash | §2 step 3 | Changed after the PR #27 review (Cas agreed 2026-11-10): the `navigate` handler captures `navigation.currentEntry.url` before `intercept()` commits, and the rollback goes there, so `/posts?page=3#c12` stays as it was. §2 step 3 and C-32 reworded; unit test asserts the full URL |
| N68 | Playwright's `toHaveURL('/x')` resolves against the origin like `goto('/x')` (N31) | `toHaveURL('/users')` failed under `baseURL: …/sub/app/` | E2E tests use relative URLs for both; the CI-3 repo test checks `goto` |
| N69 | Vite's dev server answers paths outside its `base` with its own HTML page, not the app | `QUIVER_BASE=/sub/app/` server, `GET /outside` → a Vite "did you mean /sub/app/" page | Enough for CI-4: the test proves a new document loaded (the window marker is gone) |
| N70 | The starter's `ErrorCard` ignores `retry` | `main.js` passes `({ message }) => ErrorCard(message)` | Left for P7's loading/error view recipes; core's `retry` is covered by unit tests (C-46) |

**Draft upstream issue for N64** (not filed; needs Cas's OK):

> **`onCleanup` never runs for components nested inside a template that is removed**
>
> `@arrow-js/core` 1.0.6. When a reactive slot drops a component directly, its `onCleanup` callbacks run. When it drops a plain template that contains a component, they don't:
>
> ```js
> const C = component(() => { onCleanup(() => console.log('cleanup')); return html`<p>c</p>` })
> const s = reactive({ on: true })
> html`${() => (s.on ? C() : '')}`(document.body)              // s.on = false → logs 'cleanup'
> html`${() => (s.on ? html`<div>${C()}</div>` : '')}`(document.body) // s.on = false → nothing
> ```
>
> In `html.ts`, `removeUnmounted` sends a template chunk (`r === true`) to `recycleChunk`, and only component chunks (`r === false`) reach `destroyChunk`, which runs `chunk.u`. The recycled parent never visits the component chunks in its expression slots, so their cleanups (and the listeners and watchers they would stop) leak. Expected: removing a template destroys or cleans up the components rendered inside it, recursively.

## P3 follow-up (2026-11-10, repo at `fd4d585`)

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N71 | The Cmd/Ctrl-click e2e test flaked under parallel load because it depended on the new tab loading from the Vite dev server | `--repeat-each 40 --workers 4` on 4 cores: 2/80 failed, either no `page` event in 30 s or the tab still at an empty URL after 15 s; 0/60 at `--workers 1`. With a `toPass` retry around the click, the new tab still sometimes never finished loading | The test checks that the click issued a document request for `/users` and left the original page and its URL alone: 200/200 at `--repeat-each 100 --workers 4`. Putting 2.x's `@click` back on `Link` still fails it |
| N72 | A guard-cancel rollback reloaded the whole document, in 2.x and in P3 as merged | The `navigate` handler returned without intercepting `info.rollback` navigations, so the browser treated `navigation.navigate(from, { history: 'replace' })` as a cross-document load. Probe in Chromium (Vite dev): with a cancelling guard, `go('/login')` destroyed the page's execution context | The handler now calls `event.intercept()` with no handler for rollbacks: the URL changes in place, no pipeline, no reload. Same probe: URL back to `/users?page=3#c12`, the window marker survives, `useRoute().path()` is `/users`. §2 step 1 reworded; unit test asserts no document load |
