# Layouts

A layout is a function that wraps a page's content in a consistent shell — navigation, headers, footers, and so on.

---

## How layouts work

A layout function receives the rendered page content as its argument and returns an Arrow.js template.

```js
export function MyLayout(content) {
  return html`
    <div class="wrapper">
      <header>...</header>
      <main>${content}</main>
    </div>
  `
}
```

The router reads `meta.layout` from the page module and looks up the matching layout in `src/layouts/index.js`. If no layout is specified, `'basic'` is used.

---

## Built-in layouts

### `BasicLayout`

A centred card layout. Used for standalone pages like login or error screens.

Select it with:
```js
export const meta = { layout: 'basic' }
```

### `MenuLayout`

A two-column layout with a sidebar (navigation links, app name) and a content area with a header bar.

Select it with:
```js
export const meta = { layout: 'menu' }
```

The sidebar app name and tagline come from the `'app'` DI key provided in `src/main.js`:

```js
provide('app', { name: 'My App', tagline: 'Tagline here' })
```

The header user menu reads the `'currentUser'` DI key. Provide it in `src/main.js` with the shape below; the layout falls back to a generic guest entry if the key is absent:

```js
provide('currentUser', {
  name: 'Alice Nkosi',
  email: 'alice@example.com',
  avatar: aliceAvatarUrl,   // import from src/assets/ or use a URL string
})
```

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Displayed in the dropdown card |
| `email` | `string` | Displayed in the header pill and dropdown card |
| `avatar` | `string` | URL for the avatar `<img>` — import from `src/assets/` or leave `''` |

To connect real authentication, replace the `provide('currentUser', ...)` call in `src/main.js` with data from your auth API before calling `createApp()`:

```js
// src/main.js
const session = await fetchCurrentUser()   // your auth call
provide('currentUser', {
  name: session.name,
  email: session.email,
  avatar: session.avatarUrl || '',
})
await createApp({ root: '#app' })
```

---

## Creating a new layout

**1. Create the layout file:**

```js
// src/layouts/BlankLayout.js
import { html } from '@arrow-js/core'

export function BlankLayout(content) {
  return html`
    <div class="min-h-screen bg-white">
      ${content}
    </div>
  `
}
```

**2. Register it in `src/layouts/index.js`:**

```js
import { BasicLayout } from './BasicLayout.js'
import { BlankLayout }  from './BlankLayout.js'
import { MenuLayout }  from './MenuLayout.js'

export const layouts = {
  basic: BasicLayout,
  blank: BlankLayout,
  menu:  MenuLayout,
}
```

**3. Use it in a page:**

```js
export const meta = { layout: 'blank', title: 'My Page' }
```
