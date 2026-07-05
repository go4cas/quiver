# Contributing

Thanks for your interest in contributing. Quiver is a small, focused starter kit — contributions that keep it that way are most welcome.

---

## What belongs here

Quiver is a **starter template**, not a general-purpose framework. Good contributions:

- Fix bugs in the framework internals (`src/framework/`)
- Improve test coverage or fix flaky tests
- Correct or expand documentation
- Fix tooling (Vite config, Vitest, Playwright, VitePress)

Things that are better done in your own fork:

- App-specific pages, components, or state modules
- Swapping out Arrow.js for another UI library
- Adding a backend or auth system

If you're unsure whether something belongs, open an issue first.

---

## Reporting a bug

1. Check [existing issues](https://github.com/go4cas/quiver/issues) — it may already be reported.
2. Open a new issue with:
   - What you expected to happen
   - What actually happened
   - Minimal steps to reproduce
   - Node.js version and OS

---

## Suggesting a feature

Open an issue describing the problem you're trying to solve before writing any code. This avoids effort on changes that don't fit the project's scope.

---

## Submitting a pull request

**1. Fork and set up locally:**

```bash
git clone https://github.com/<your-username>/quiver
cd quiver
npm install
```

**2. Create a focused branch:**

```bash
git checkout -b fix/route-scoring
```

One concern per PR. Avoid mixing bug fixes with refactors or unrelated doc edits.

**3. Make your changes and run the checks:**

```bash
npm run typecheck     # JSDoc type check (tsc, checkJs)
npm test              # unit tests (one-shot; use npm run test:watch while developing)
npm run test:e2e      # end-to-end tests
```

All three must pass before opening a PR — CI runs them on every push.

**4. Match the existing code style:**

- No unnecessary comments — only add one when the *why* is non-obvious
- No new abstractions beyond what the change requires
- Keep components, composables, and state modules in their respective folders
- Type new code with JSDoc (`@param`/`@returns`) — CI enforces a clean `npm run typecheck`

**5. Open the PR:**

- Link the related issue if one exists
- Describe what changed and why, not just what the code does
- Keep the diff small — reviewers are humans

---

## Development scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run typecheck` | Type-check `src/` via JSDoc (tsc, checkJs) |
| `npm run docs:dev` | Start the documentation site locally |
