# Changelog

All notable changes to Quiver are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- A malformed percent-escape in a URL (e.g. `/users/%zz`) now matches the route with the raw segment instead of rendering the error page
- A toast's auto-dismiss timer is cancelled on manual dismiss, so a stale timer can no longer fire against a removed toast
- A throwing `onSubmit` is caught and surfaced as `form.message` instead of becoming an unhandled promise rejection
- The toast demo page's position `<select>` now follows the template's own reactive-slot and `.key()` rules

## [1.1.0] - 2026-07-05

### Added

- The user detail page demonstrates a reactive document title via `useMeta` (`src/pages/users/[id].js`)

### Removed

- `src/components/index.js` barrel file — import components directly from their source files

### Fixed

- Reactive `useMeta` watchers are now cleared by the router on every navigation, so a reactive title can no longer leak onto the next page

- Rapid navigation can no longer render a stale page: `resolveRoute` now ignores writes from superseded navigations
- A guard cancelling a navigation no longer remounts the current page (and can no longer cause a navigate loop)
- `go()` no longer leaks unhandled `AbortError` rejections when a navigation is preempted or cancelled
- `useForm` ignores repeat submits while an async `validate` is still pending
- Inactive nav links no longer render `aria-current="undefined"` (announced as current by screen readers); the attribute is now omitted entirely

### Changed

- `npm test` now runs the unit suite once; use `npm run test:watch` for watch mode
- CI workflow token is scoped to `contents: read`
- Docs: guard initial-load behaviour, `useFetch` `reset()`/`delay`, and async `validate` are now documented; routing guide notes that client-side guards are UX, not authorization
- Dev dependencies bumped (Vite 8.1.3, Vitest 4.1.9, Playwright 1.61.1, Tailwind 4.3.2) and GitHub Actions updated (checkout v7, setup-node v6, Pages actions) via Dependabot

## [1.0.0] - 2026-07-05

First tagged release.

### Added

- File-based routing built on the Navigation API, with dynamic segments, specificity-aware matching, and `beforeEach` navigation guards
- Layout system with `BasicLayout` and `MenuLayout`
- Reactive global state via `createStore()`, with built-in `userState`, `uiState`, `toastState`, and `routerState` modules
- Composables: `useRoute`, `useRouter`, `useForm`, `useFetch`, `useToast`
- `provide`/`inject` dependency injection and `useMeta` for document metadata
- Four visual themes (Monochrome, Liquid Glass, Retro / Y2K, Neo Brutalism) with dark/light mode
- Vitest unit tests, Playwright end-to-end tests, and a CI workflow that runs both
- AI tooling: `CLAUDE.md`, `AGENTS.md`, Copilot instructions, and Claude Code slash commands
- VitePress documentation site with developer guides and API reference

### Fixed

- Navigation guards now run on the initial page load, so deep links can no longer bypass them
- `useFetch` no longer lets a superseded request clear the loading state of a newer one; caller-supplied abort signals are honoured; `reset()` aborts in-flight requests
- `useForm` awaits async `validate()` functions instead of silently passing validation
- Blocked `localStorage` (embedded iframes, strict privacy modes) no longer crashes the app at startup

[1.1.0]: https://github.com/go4cas/quiver/releases/tag/v1.1.0
[1.0.0]: https://github.com/go4cas/quiver/releases/tag/v1.0.0
