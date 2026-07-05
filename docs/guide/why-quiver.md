# Why Quiver?

Quiver is a **starter template, not a framework**. You don't install it from npm — you scaffold it, read it, and own every line from day one. The entire framework layer (router, stores, DI, composables) is around 350 lines of plain JavaScript in `src/framework/`, with exactly two runtime dependencies: `@arrow-js/core` and `@arrow-js/framework`.

That trade — a codebase you can read in an afternoon instead of an ecosystem you depend on — is the whole point. This page is an honest look at when that trade is right for you, and when it isn't.

## Choose Quiver when…

- **You want a tiny reactive core.** Arrow.js is under 5 KB, uses tagged template literals instead of JSX or a compiler, and its reactivity is plain proxied objects. No virtual DOM, no build-time magic.
- **You want SPA conventions without assembling them.** File-based routing, layouts, global stores, form/fetch/toast composables, and a working Vitest + Playwright setup are pre-wired and tested.
- **You want to own your stack.** There is no framework version to upgrade past you, no plugin API to be deprecated. If the router doesn't do what you need, it's one readable file — change it.
- **You build with AI assistants.** Quiver ships `CLAUDE.md`, `AGENTS.md`, Copilot instructions, and Claude Code slash commands, so an AI agent knows the conventions of this codebase from the first prompt.

## How it compares

| | What it is | How Quiver differs |
|---|---|---|
| **Raw Arrow.js** | Reactive primitives + templates, ~5 KB | Arrow.js gives you reactivity and rendering — nothing else. Quiver adds the application layer: routing, layouts, state, composables, testing, and conventions. |
| **Alpine.js / petite-vue** | Sprinkle interactivity onto server-rendered HTML, no build step | Those shine when a server renders your pages. Quiver builds client-side SPAs with Vite: bundling, code-split routes, HMR, and a test harness. |
| **Vue / React starters** | Full ecosystems: component libraries, devtools, SSR, huge communities | The ecosystems are unbeatable — and enormous. Quiver trades all of that for two dependencies and a framework layer you can hold in your head. |
| **Lit** | Web Components for reusable, framework-agnostic design systems | Lit targets component libraries that outlive any one app. Quiver targets the app itself. |

## Choose something else when…

- **You need SSR or static generation.** Quiver is client-side only. If SEO on content pages is critical, use a framework with a server story (Nuxt, Next, Astro).
- **You need older browsers.** The router is built on the Navigation API — Chrome/Edge 102+, Safari 26.2+, Firefox 147+. There is no fallback.
- **You want TypeScript-first.** Quiver is plain JavaScript by design.
- **You're staffing a large team.** Ecosystem, hiring pool, and battle-tested component libraries matter at scale — that's what the big frameworks are for.

If those constraints don't apply, you get something rare: an app where the "framework" is small enough to be your own code.

Ready to try it? Head to [Getting Started](./getting-started) or [open it in StackBlitz](https://stackblitz.com/github/go4cas/quiver).
