# Claude Code context

Quiver's agent guide and index ship inside the installed package, so they always match the core version this app uses:

@node_modules/@go4cas/quiver/AGENTS.md
@node_modules/@go4cas/quiver/llms.txt

## This app

A Quiver starter: Vite, file-based routes in `src/pages/`, plain CSS on the `--q-*` tokens, Vitest and Playwright.

- `src/quiver/` holds copied recipes (theme, toasts, theme switcher, layouts, views, Link, useForm, hmrState). They are app code now: edit them. The originals and their READMEs (usage, tokens, classes) are in `node_modules/@go4cas/quiver/recipes/`.
- `src/main.js` provides `'app'`, `'nav'` and `'currentUser'` for `MenuLayout`; add sidebar links to `'nav'` there.
- Register extra layouts in `src/layouts/index.js`.
- `src/style.css` is the CSS entry: add each new stylesheet there, before `quiver/theme/effects.css`.
- `src/state/` holds app state, `src/components/` app components, `tests/unit/` and `tests/e2e/` the tests.

The `/add-*` commands come from the Quiver Claude Code plugin: `/plugin marketplace add go4cas/quiver`, then `/plugin install quiver@quiver`.

Commands: `bun run dev`, `bun run build`, `bun run typecheck`, `bun run test`, `bun run test:e2e`. Run `bun run typecheck && bun run test && bun run test:e2e` before finishing a task.
