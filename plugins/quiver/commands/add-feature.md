---
description: Plan and build a feature (state, components, pages, nav, e2e test) in a Quiver app
argument-hint: <feature — short description>
---
Add a feature to this app: $ARGUMENTS

The app is the folder with the app's `package.json`; in the Quiver repository itself it is `starter/`. Recipes (toasts, layouts, views, theme switcher, Link, useForm, hmrState) are in `node_modules/@go4cas/quiver/recipes/` (in the Quiver repository: `recipes/`); install one rather than rebuilding it.

## Step 1: plan first

Write a short plan and wait for the developer's go-ahead before writing code:

- **Pages**: each route and its purpose (`src/pages/…`)
- **State**: each store, its data and actions (`src/state/…`)
- **Components**: new reusable ones (`src/components/…`)
- **Recipes and composables** it uses: `useToast` (toasts recipe) for notifications, `useForm` (recipe) for forms, `useFetch`/`useStorage` from `arrow-use` for HTTP and persistence
- **Navigation**: `meta.nav: { label, order }` on the pages that belong in the menu layout's sidebar (or entries in `nav` in `src/app.config.js`, if it sets one)
- **Tests**: the e2e scenarios for the main flow, plus unit tests for state

## Step 2: build it

In this order, following the matching `/add-*` command's conventions:

1. State modules (`/add-state`): module-scope `reactive()` singletons with JSDoc.
2. Recipes the feature needs (`/add-component <recipe>`).
3. Components (`/add-component <Name>`), imported directly from their files (no barrel).
4. Pages (`/add-page <path>`), each with `export const meta` and `useMeta`.
5. Nav entries.
6. An e2e test in `tests/e2e/<feature>.test.js` with `getByRole`, `getByLabel` and `getByTestId`. In the Quiver repository, navigate with relative URLs (`page.goto('users')`, never `goto('/users')`), because every test also runs under `/sub/app/`.

Arrow.js rules throughout: `() =>` around values that change, no `<!-- -->` inside template literals, `aria-disabled` instead of `.disabled`, `.key(id)` in loops, JSDoc on exported functions and props.

## Step 3: verify

Run the app and try the flow, then the full checks (in the Quiver repository: `bun run typecheck && bun run test && bun run test:e2e`), and fix failures before reporting what was built.
