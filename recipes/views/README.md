# views

`LoadingView` and `ErrorView` for `createApp({ loading, error })`. Core's own defaults are bare (`<p>Loading…</p>`, `<p role="alert">message</p>`); these are styled cards.

## Install

Copy `views.js` and `views.css` to `src/quiver/views/`, plus the `theme` recipe. Needs `@go4cas/quiver`.

## Use

```js
import { LoadingView, ErrorView } from './quiver/views/views.js'

createApp({ target: '#app', layouts, loading: LoadingView, error: ErrorView })
```

`ErrorView` receives `{ message, error, retry }` from core when a guard, a page load or a render throws. **Try again** calls `retry()`, which re-resolves the current route; **Go home** is a plain link to `url('/')`, so it works even when the router is stuck.

## Styling

Classes `q-view`, `q-view__card` (with the `q-panel` hook; `data-tone="error"` on errors), `q-view__title`, `q-view__text`, `q-view__actions`, `q-view__action` (`data-variant="secondary"` for the link). Tokens: `--q-color-{surface,surface-raised,line,line-strong,fg,fg-soft,error}`, `--q-radius-{panel,control}`, `--q-shadow-panel`.
