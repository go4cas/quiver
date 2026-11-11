---
layout: home

hero:
  tagline: A drop-in router, context and meta layer for Arrow.js. Composables in arrow-use, UI as copy-in recipes, and a starter app that puts it all together.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API reference
      link: /api/
    - theme: alt
      text: Examples
      link: /examples

features:
  - title: Drop-in router
    details: "@go4cas/quiver adds routing on the Navigation API, layouts, guards, afterEach/onError hooks, provide/inject and useMeta to any Arrow.js app. Thirteen exports, one peer dependency, no CSS."
    link: /api/core
  - title: File-based routes, any build
    details: A file in src/pages/ is a route. The Vite plugin, the Bun plugin and the quiver routes CLI share one scanner, so the same pages work with Vite, Bun.build or no bundler at all.
    link: /guide/routing
  - title: Base paths
    details: Serve the app under a sub-path. Every path your code sees is base-relative, url() adds the base for hrefs, and links outside the base load normally.
    link: /guide/routing#base-path
  - title: arrow-use composables
    details: useFetch, useStorage, useMediaQuery and useEventListener for any Arrow app, with or without Quiver. Getters plus stop(), released automatically when the component() that owns them unmounts or the Quiver page that calls them is left.
    link: /arrow-use/
  - title: Copy-in recipes
    details: Theme tokens, toasts, a theme switcher, layouts, loading and error views, Link, useForm and hmrState. You copy them into src/quiver/ and own them; /add-* commands do it for you.
    link: /recipes/
  - title: Starter app
    details: A full app with five themes in plain CSS on a --q-* token contract, unit, e2e and screenshot tests, and AGENTS.md for AI assistants. bunx degit go4cas/quiver/starter my-app.
    link: /guide/getting-started#start-from-the-starter
---
