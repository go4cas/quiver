# views

`LoadingView` and `ErrorView`, styled cards for `createApp({ loading, error })`. Core's own defaults are a bare `<p>Loading…</p>` and `<p role="alert">message</p>`.

| | |
|---|---|
| Command | `/add-component views` (aliases: `LoadingView`, `ErrorView`, `loading`, `error`) |
| Copies | `views.js`, `views.css` → `src/quiver/views/` |
| CSS order | after `tokens.css` and `base.css`, before `effects.css` |
| Needs | `theme`, `@go4cas/quiver` |
| Tokens | `--q-color-{surface,surface-raised,line,line-strong,fg,fg-soft,error}`, `--q-radius-{panel,control}`, `--q-shadow-panel` |

## Use

```js
import { LoadingView, ErrorView } from './quiver/views/views.js'

createApp({ target: '#app', layouts, loading: LoadingView, error: ErrorView })
```

`ErrorView` receives `{ message, error, retry }` when a guard, a page load or a render throws. **Try again** calls `retry()`, which runs the current navigation again; **Go home** is a plain link to `url('/')`, so it works even when the router is stuck. The texts are generic ("Something went wrong"); edit your copy to change them, or to report `error` somewhere.

Classes: `q-view`, `q-view__card` (with the `q-panel` hook; `data-tone="error"` on errors, `role="status"` / `role="alert"`), `q-view__title`, `q-view__text`, `q-view__actions`, `q-view__action` (`data-variant="secondary"` on the link).
