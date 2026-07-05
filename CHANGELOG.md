# Changelog

All notable changes to Quiver are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Rapid navigation can no longer render a stale page: `resolveRoute` now ignores writes from superseded navigations
- A guard cancelling a navigation no longer remounts the current page (and can no longer cause a navigate loop)
- `go()` no longer leaks unhandled `AbortError` rejections when a navigation is preempted or cancelled
- `useForm` ignores repeat submits while an async `validate` is still pending
- Inactive nav links no longer render `aria-current="undefined"` (announced as current by screen readers); the attribute is now omitted entirely

### Changed

- `npm test` now runs the unit suite once; use `npm run test:watch` for watch mode
- CI workflow token is scoped to `contents: read`
- Docs: guard initial-load behaviour, `useFetch` `reset()`/`delay`, and async `validate` are now documented; routing guide notes that client-side guards are UX, not authorization

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

[1.0.0]: https://github.com/go4cas/quiver/releases/tag/v1.0.0
