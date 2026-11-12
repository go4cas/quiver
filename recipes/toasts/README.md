# toasts

Toast notifications. `useToast()` shows them, `ToastContainer` renders them bottom-right, and `toastState` holds them. Only `@arrow-js/core` is imported, so it works in any Arrow app, with or without Quiver.

## Install

`/add-component toast` copies `Toasts.js` and `Toasts.css` to `src/components/`, plus the [theme](../theme/README.md) recipe for the `--q-*` tokens it reads. Load `Toasts.css` after `tokens.css` (and `base.css`, if you use it).

## Use

Mount the container once, near the root of the app (the [layouts](../layouts/README.md) recipe already does):

```js
import { ToastContainer } from './components/Toasts.js'

html`${App()}${ToastContainer()}`(document.getElementById('app'))
```

Then, from any page, component or event handler:

```js
import { useToast } from '../components/Toasts.js'

const toast = useToast()
toast.success('Changes saved.')
toast.error('Could not save.', { duration: 0 })          // stays until dismissed
toast.info('Read-only toast', { dismissible: false })
const id = toast.warning('Expiring soon'); toast.dismiss(id)
```

Each method returns the toast id. Defaults (`duration: 4000` ms, `dismissible: true`) live in `toastState.add()`: edit them there to change every toast.

Dismissing sets `data-state="closing"`, waits for the element's exit animation (`el.getAnimations()`), then removes the toast, so the JS never hard-codes the CSS duration. With reduced motion, or without the CSS, it is removed at once.

## Styling

Classes `q-toasts`, `q-toast` (with the `q-panel` hook), `q-toast__message`, `q-toast__dismiss`; variants `data-type="success|error|warning|info"`, `data-state="open|closing"`. Tokens: `--q-color-{success,error,warning,info}` and their `-tint`, `--q-radius-panel`, `--q-shadow-float`.
