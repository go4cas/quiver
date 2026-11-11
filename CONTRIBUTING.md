# Contributing to Quiver

Thanks for your interest in contributing. Quiver is a small, focused library for Arrow.js apps: a router package, a composables package, copy-in recipes and a starter app. Contributions that keep it small are most welcome.

---

## What belongs here

Quiver is a drop-in layer for Arrow.js, not a general-purpose framework. Good contributions:

- Fix bugs in the core package (`packages/quiver/`), `arrow-use` (`packages/arrow-use/`) or a recipe (`recipes/`)
- Improve test coverage or fix flaky tests
- Correct or expand documentation
- Fix tooling (Vite config, Vitest, Playwright, VitePress)

Things that are better done in your own fork:

- App-specific pages, components, or state modules
- Swapping out Arrow.js for another UI library
- Adding a backend or auth system
- SSR or hydration, a plugin system, or a fallback for browsers without the Navigation API

If you're unsure whether something belongs, open an issue first.

---

## Reporting a bug

1. Check [existing issues](https://github.com/go4cas/quiver/issues) — it may already be reported.
2. Open a new issue with:
   - What you expected to happen
   - What actually happened
   - Minimal steps to reproduce
   - Bun version (or Node.js version, if using npm) and OS

---

## Suggesting a feature

Open an issue describing the problem you're trying to solve before writing any code. This avoids effort on changes that don't fit the project's scope.

---

## Submitting a pull request

**1. Fork and set up locally:**

```bash
git clone https://github.com/<your-username>/quiver
cd quiver
bun install
```

**2. Create a focused branch:**

```bash
git checkout -b fix/route-scoring
```

One concern per PR. Avoid mixing bug fixes with refactors or unrelated doc edits.

**3. Make your changes and run the checks:**

```bash
bun run typecheck     # JSDoc type check (tsc, checkJs)
bun run test          # repo checks, then every workspace's unit tests
bun run test:e2e      # end-to-end tests in the starter, examples, arrow-use and recipes
```

All three must pass before opening a PR — CI runs them on every push, along with the screenshot suite and the npm tarball checks (`bun run pack:check`, `bun run pack:try`). After editing a recipe in `recipes/`, run `bun run recipes:sync` so the starter's copy matches. User-visible changes go under `## [Unreleased]` in `CHANGELOG.md`.

**4. Match the existing code style:**

- No unnecessary comments — only add one when the *why* is non-obvious
- No new abstractions beyond what the change requires
- Keep components, composables, and state modules in their respective folders
- Follow `AGENTS.md`: it holds the repository's conventions for people and AI assistants alike
- Type new code with JSDoc (`@param`/`@returns`) — CI enforces a clean `bun run typecheck`

**5. Open the PR:**

- Link the related issue if one exists
- Describe what changed and why, not just what the code does
- Keep the diff small — reviewers are humans

---

## Development scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the starter's Vite dev server |
| `bun run test` | Repo checks, then every workspace's unit tests (Vitest) |
| `bun run test:watch` | The starter's unit tests in watch mode |
| `bun run test:e2e` | End-to-end tests (Playwright) in every workspace that has them |
| `bun run typecheck` | Type-check every workspace via JSDoc (tsc, checkJs) |
| `bun run pack:check` | Check the file lists of both npm tarballs |
| `bun run pack:try` | Run the examples and the starter against the packed tarballs |
| `bun run recipes:sync` | Copy `recipes/` into `starter/src/quiver/` |
| `bun run docs:dev` | Start the documentation site locally |

---

## Releasing

Maintainers only: see [RELEASING.md](RELEASING.md).

---

## Licence

By contributing, you agree that your changes will be released under the [MIT Licence](LICENSE).
