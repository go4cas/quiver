# App structure and config

Quiver reads a few folders in `src/` and turns them into one module, `quiver:app`. You pass that module to `createApp()`:

```js
// src/main.js
import { createApp } from '@go4cas/quiver'
import app from 'quiver:app'

await createApp(app, { target: '#app', base: import.meta.env.BASE_URL })
```

| Path | Holds | Becomes |
|---|---|---|
| `pages/` | one file per route ([routing](./routing)) | the routes and the not-found page |
| `pages/**/_middleware.js` | a guard for that folder's routes | section [middleware](./middleware) |
| `layouts/<name>.js` | a layout, as the default export | the layout `<name>` ([layouts](./layouts)) |
| `middleware/<file>.js` | a guard for every navigation | global [middleware](./middleware), in file-name order |
| `views/loading.js`, `views/error.js` | the loading and error views | what `createApp` shows while loading and on errors |
| `app.config.js` | a plain object, as the default export | one context key per property |
| each page's `meta.nav` | `{ label, order? }` | the `'nav'` context key |

Only `pages/` is required. `components/`, `composables/`, `state/` and `styles/` are folders for your own code and installed [recipes](/recipes/), and Quiver doesn't read them.

The [Vite plugin](/api/vite#quiver-app) and the [Bun plugin](/api/bun) serve `quiver:app`. Without a bundler, `quiver app --watch` writes it to `src/app.gen.js` ([CLI](/api/cli#quiver-app)). For types, add `"@go4cas/quiver/client"` to `compilerOptions.types`.

## `createApp(app, options)`

It does four things, in this order:

1. It provides each key of `app.config.js` under its own name.
2. It provides the menu links as `'nav'`, unless the config has its own `nav`.
3. It starts the router with the routes and middleware, at `options.base`.
4. It mounts into `options.target`, with the layouts and views.

It resolves once the first page is on screen. Guards and hooks you register before it (`beforeEach`, `afterEach`, `onError`) see the first navigation. If a step fails (a missing target, a bad base), it rejects and takes back what it provided, so you can fix the call and run it again. All options are on the [API page](/api/core#createapp).

## `app.config.js`

Settings that layouts and components read with `inject()`. Each top-level key is provided under its own name:

```js
// src/app.config.js
import avatar from './assets/ada.svg'

export default {
  app: { name: 'Acme', tagline: 'Internal tools', logo: '/logo.svg' },
  currentUser: { name: 'Ada', email: 'ada@example.com', avatar },
  apiBase: 'https://api.example.com',
}
```

```js
import { inject } from '@go4cas/quiver'

const apiBase = inject('apiBase', '/api')
```

The keys are yours. Only the [menu layout](/recipes/layouts) reads any, and it reads `app`, `nav` and `currentUser`. The file is a normal module, so it can import assets or build values. For values that change at runtime, such as the signed-in user, provide a [store](./state) and read it reactively.

## Menu links from pages

A page joins the menu with `meta.nav`:

```js
// src/pages/users/index.js
export const meta = { layout: 'menu', title: 'Team', nav: { label: 'Team', order: 2 } }
```

The build collects them into `[{ to, label }]`, sorted by `order` (pages without one come last) and then by path. It reads `meta` without running the page, so `meta` must be a plain literal: strings, numbers, booleans, objects and arrays, with no variables, calls or template literals. When the build can't read a `meta` that mentions `nav` or `layout`, it warns, and that page gets no menu link. A route with a parameter (`/users/:id`) and the not-found page can't be menu links, and get a warning.

For links that don't come from pages (an external link, a different order), set `nav` in `app.config.js`. It replaces the generated list:

```js
export default {
  nav: [
    { to: '/', label: 'Home' },
    { to: 'https://docs.example.com', label: 'Docs' },
  ],
}
```

## Views

`views/loading.js` shows while a page loads. `views/error.js` shows when a guard, a page load or a render throws, and gets `{ message, error, retry }`. Both are default exports, and both are optional: core falls back to `<p>Loading…</p>` and `<p role="alert">message</p>`. The [`views` recipe](/recipes/views) gives you styled ones. Any other `.js` file in `views/` is a build error. Other files, such as `views.css`, are ignored.

```js
// src/views/error.js
import { html } from '@arrow-js/core'

export default function ErrorView({ message, retry }) {
  return html`<p role="alert">${message} <button @click="${() => retry()}">Try again</button></p>`
}
```

## When something changes

In dev, the Vite plugin reloads the page when you add or remove a page, layout, middleware file, view or `app.config.js`. It also reloads when an edit to a page changes the menu links. Editing what's inside one of these files is a normal hot update. With the CLI, keep `quiver app --watch` running.
