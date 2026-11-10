---
description: Create a file-based route page for a Quiver app
argument-hint: <route path, e.g. contact, users/profile, posts/[id]>
---
Create a page for the route path: $ARGUMENTS

The app is the folder with the app's `package.json`; in the Quiver repository itself it is `starter/`. Pages live in `src/pages/` (the folder the `quiver()` Vite plugin, the Bun plugin or `quiver routes` scans).

1. Map the path to a file under `src/pages/`, creating folders as needed:
   - `contact` → `src/pages/contact.js` (route `/contact`)
   - `users/profile` → `src/pages/users/profile.js`
   - `posts/[id]` → `src/pages/posts/[id].js` (route `/posts/:id`)
   - `users` as a folder index → `src/pages/users/index.js`

   Files and folders starting with `_` or `.` are not routes. Two files for one route (`users.js` and `users/index.js`) are a scan error.

2. Write the page:

```js
import { html } from '@arrow-js/core'
import { useMeta } from '@go4cas/quiver'

export const meta = { layout: 'menu', title: '<Title>' }

function <Name>Page() {
  useMeta({ title: '<Title>' })
  return html`
    <section>
      <h1>${'<Title>'}</h1>
    </section>
  `
}

export default <Name>Page
```

   - Derive the title from the path (`posts/[id]` → `Post`).
   - `meta.layout` names a layout registered in `createApp({ layouts })`. Use `'menu'` if the app has it (the layouts recipe), `'basic'` for standalone screens such as login; leave `layout` out to get the app's `defaultLayout`.
   - Match the markup and classes of the app's existing pages (the starter uses `page`, `page__title`, `card`…).
   - For a dynamic segment, read it inside the function: `const route = useRoute()` then `${() => route.params().id}`.
   - Titles can be reactive: `useMeta({ title: () => \`Team (${state.users.length})\` })`.
   - Links: `Link` from the link recipe or `<a href="${url('/path')}">`, never an `@click` calling `go()`.
   - For API calls use `useFetch` from `arrow-use`; for notifications `useToast()` from the toasts recipe.
   - Arrow.js rules: `() =>` around values that change, no `<!-- -->` inside template literals, `aria-disabled` instead of `.disabled`, `.key(id)` in loops; JSDoc on helpers.

3. If the app has a sidebar nav (the layouts recipe), offer to add the page to the `'nav'` list in `main.js`.

4. Run the app's checks and fix failures (in the Quiver repository: `bun run typecheck && bun run test && bun run test:e2e`). Report the file, the URL it maps to, and follow-ups (a nav entry, a state module, an e2e test).
