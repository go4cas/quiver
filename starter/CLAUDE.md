# Claude Code context

Quiver's agent guide and index ship inside the installed package, so they always match the core version this app uses:

@node_modules/@go4cas/quiver/AGENTS.md
@node_modules/@go4cas/quiver/llms.txt

## This app

A Quiver starter: Vite, file-based routes in `src/pages/`, plain CSS on the `--q-*` tokens, Vitest and Playwright.

- `src/main.js` is one call, `await createApp(app, { target, base })`, with `app` from `quiver:app`, which the `quiver()` Vite plugin builds from `src/`.
- `src/layouts/<name>.js` is the layout `<name>` (`default.js` for pages without `meta.layout`); `src/views/loading.js` and `error.js` are the loading and error views; `src/middleware/*.js` and `src/pages/**/_middleware.js` are guards. No registration anywhere.
- `src/app.config.js` holds `app` and `currentUser` for the menu layout. Sidebar links come from each page's `meta.nav: { label, order }`.
- Installed recipes are app code now: edit them. They sit by role: `styles/` (theme), `components/` (toasts, theme switcher, Link), `composables/` (useForm, hmrState), `layouts/`, `views/`. The originals and their READMEs (usage, tokens, classes) are in `node_modules/@go4cas/quiver/recipes/`.
- `src/style.css` is the CSS entry: add each new stylesheet there, before `styles/effects.css`.
- `src/state/` holds app state, `src/components/` app components, `tests/unit/` and `tests/e2e/` the tests.

The `/add-*` commands come from the Quiver Claude Code plugin: `/plugin marketplace add go4cas/quiver`, then `/plugin install quiver@quiver`.

Commands: `bun run dev`, `bun run build`, `bun run typecheck`, `bun run test`, `bun run test:e2e`. Run `bun run typecheck && bun run test && bun run test:e2e` before finishing a task.
