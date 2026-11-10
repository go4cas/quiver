# toasts

Toast notifications: `useToast()` shows them, `ToastContainer` renders them bottom-right, `toastState` holds them. Imports only `@arrow-js/core`, so it works in any Arrow app.

| | |
|---|---|
| Command | `/add-component toast` (aliases: `toasts`, `useToast`, `ToastContainer`, `notifications`) |
| Copies | `toasts.js`, `toasts.css` → `src/quiver/toasts/` |
| CSS order | after `tokens.css` and `base.css` |
| Needs | `theme` |
| Tokens | `--q-color-{success,error,warning,info}` and their `-tint`, `--q-radius-panel`, `--q-shadow-float` |

## Use

Mount the container once, near the root. The [layouts](./layouts) recipe already does; in an app without it:

```js
import { html } from '@arrow-js/core'
import { ToastContainer } from './quiver/toasts/toasts.js'

html`${App()}${ToastContainer()}`(document.getElementById('app'))
```

Then from any page, component or handler:

```js
import { useToast } from '../quiver/toasts/toasts.js'

const toast = useToast()
toast.success('Changes saved.')
toast.error('Could not save.', { duration: 0 })        // stays until dismissed
toast.info('Syncing…', { dismissible: false })
const id = toast.warning('Session expires soon')
await toast.dismiss(id)
```

| Method | |
|---|---|
| `success(message, opts?)`, `error(…)`, `warning(…)`, `info(…)` | shows a toast; returns its id |
| `dismiss(id)` | closes it; the promise resolves once it's gone |

| Option | Default | |
|---|---|---|
| `duration` | `4000` | ms before it closes itself; `0` never |
| `dismissible` | `true` | show a close button |

Change the defaults for every toast in `toastState.add()`, in your copy.

## Behaviour

Each toast has `role="alert"`. Dismissing sets `data-state="closing"`, waits for the element's exit animation (`getAnimations()`), then removes it, so JS never hard-codes the CSS duration. With reduced motion, or without the CSS, it goes at once.

Classes: `q-toasts`, `q-toast` (with the `q-panel` hook), `q-toast__message`, `q-toast__dismiss`; attributes `data-type="success|error|warning|info"` and `data-state="open|closing"`.
