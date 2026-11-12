# Why Quiver?

[Arrow.js](https://arrow-js.com) gives you reactive objects and tagged-template rendering in a few kilobytes, and nothing else. Quiver adds the application layer an SPA needs, in pieces you can take or leave:

- **A router you install, not a template you fork.** `@go4cas/quiver` is a package with 13 exports and one peer dependency: routing on the Navigation API, layouts, guards, `afterEach`/`onError`, `provide`/`inject`, `useMeta`. It renders no CSS and no wrapper markup, so it drops into an existing Arrow app.
- **Any build, or none.** The same `src/` folder (pages, layouts, middleware, views, `app.config.js`) becomes the app through a Vite plugin, a `Bun.build` plugin, or a CLI that writes a plain module for an import-map app.
- **Composables for every Arrow app.** `arrow-use` has no Quiver dependency at all.
- **UI you own.** Toasts, layouts, a theme switcher and the `--q-*` token contract are recipes: copied into your app, then yours to change, never a package you have to style around.
- **Built for AI assistants.** An agent guide and `llms.txt` ship inside the package, and the `/add-*` commands for Claude Code install recipes and scaffold pages, components and tests.

## Choose Quiver when…

- **You want a tiny reactive core.** No virtual DOM, no compiler, no JSX: Arrow's templates are tagged template literals and its state is proxied objects.
- **You want SPA conventions without assembling them.** File-based routes, layouts, guards, loading and error views, base paths, and a working Vitest and Playwright setup in the starter.
- **You want to read your dependencies.** Core is a few hundred lines of plain JavaScript with JSDoc types. The recipes are your own files.
- **You serve the app from a sub-path** (an admin panel under `/admin/`, a tool inside a larger site): every path is base-relative, and one `base` option moves the app.

## How it compares

| | What it is | How Quiver differs |
|---|---|---|
| **Raw Arrow.js** | Reactive state and templates, ~5 KB | Quiver adds routing, layouts, context and meta on top, without wrapping Arrow's API. |
| **Alpine.js, petite-vue** | Interactivity sprinkled onto server-rendered HTML | Quiver builds client-side SPAs: code-split routes, client navigation, a test harness. |
| **Vue, React** | Full ecosystems: component libraries, devtools, SSR, large communities | Unbeatable ecosystems, and much more to learn and ship. Quiver trades them for a small core you can hold in your head. |
| **Lit** | Web Components for design systems that outlive one app | Lit targets reusable components; Quiver targets the app around them. |

## Choose something else when…

- **You need SSR or static generation.** Quiver is client-side only. For SEO-critical content pages, use a framework with a server story (Nuxt, Next, Astro).
- **You need older browsers.** The router needs the Navigation API (Chrome/Edge 102+, Safari 26.2+, Firefox 147+) and has no fallback.
- **You want TypeScript source.** Quiver is plain JavaScript with JSDoc. TypeScript apps still get the generated `.d.ts` files.
- **You need a large component library** or a big hiring pool. That's what the big frameworks are for.

Ready? Head to [Getting Started](./getting-started), or browse the [examples](/examples).
