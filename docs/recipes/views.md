# views

Styled loading and error views: `views/loading.js` and `views/error.js`, which `createApp(app, options)` picks up from `src/views/`. Core's own defaults are a bare `<p>Loading…</p>` and `<p role="alert">message</p>`.

| | |
|---|---|
| Command | `/add-component views` (aliases: `LoadingView`, `ErrorView`, `loading`, `error`) |
| Installs | `src/views/loading.js`, `src/views/error.js`, `src/views/views.css` |
| CSS order | after `tokens.css` and `base.css`, before `effects.css` |
| Needs | `theme`, `@go4cas/quiver` |
| Tokens | `--q-color-{surface,surface-raised,line,line-strong,fg,fg-soft,error}`, `--q-radius-{panel,control}`, `--q-shadow-panel` |

## Use

Once installed there is nothing to wire: `quiver:app` finds both files. In a [manual setup](/guide/manual-setup), import the default exports:

```js
import LoadingView from './views/loading.js'
import ErrorView from './views/error.js'

createApp({ target: '#app', layouts, loading: LoadingView, error: ErrorView })
```

The error view receives `{ message, error, retry }` when a guard, a page load or a render throws. **Try again** calls `retry()`, which runs the current navigation again; **Go home** is a plain link to `url('/')`, so it works even when the router is stuck. The texts are generic ("Something went wrong"); edit your copy to change them, or to report `error` somewhere.

Classes: `q-view`, `q-view__card` (with the `q-panel` hook; `data-tone="error"` on errors, `role="status"` / `role="alert"`), `q-view__title`, `q-view__text`, `q-view__actions`, `q-view__action` (`data-variant="secondary"` on the link).
