# views

The loading view (`loading.js`) and the error view (`error.js`). Core's own defaults are bare (`<p>Loading…</p>`, `<p role="alert">message</p>`); these are styled cards.

## Install

`/add-component views` installs `loading.js`, `error.js` and `views.css` into `src/views/`, plus the `theme` recipe. Needs `@go4cas/quiver`.

## Use

`quiver:app` picks both files up from `src/views/`, and `createApp(app, options)` uses them, so there is nothing to wire. In a manual setup, import the default exports and pass them: `createApp({ target: '#app', loading: LoadingView, error: ErrorView })`.

The error view receives `{ message, error, retry }` from core when a guard, a page load or a render throws. **Try again** calls `retry()`, which re-resolves the current route; **Go home** is a plain link to `url('/')`, so it works even when the router is stuck.

## Styling

Classes `q-view`, `q-view__card` (with the `q-panel` hook; `data-tone="error"` on errors), `q-view__title`, `q-view__text`, `q-view__actions`, `q-view__action` (`data-variant="secondary"` for the link). Tokens: `--q-color-{surface,surface-raised,line,line-strong,fg,fg-soft,error}`, `--q-radius-{panel,control}`, `--q-shadow-panel`.
