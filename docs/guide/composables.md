# Composables

Composables are plain functions that encapsulate reusable logic. They live in `src/composables/` and are called inside page or component functions.

---

## `useRoute()`

Returns reactive accessors for the current route state.

```js
import { useRoute } from '../composables/useRoute.js'

function MyPage() {
  const route = useRoute()

  return html`
    <p>Path: ${() => route.path()}</p>
    <p>User ID: ${() => route.params().id}</p>
  `
}
```

| Accessor | Returns |
|---|---|
| `route.path()` | Current URL path string |
| `route.params()` | Object of dynamic route params |
| `route.status()` | Router status: `'idle'` · `'loading'` · `'ready'` · `'not-found'` · `'error'` |
| `route.meta()` | The `meta` object exported by the current page |

Each accessor is a function — always call it inside a `${}` slot so Arrow.js can track it reactively.

---

## `useRouter()`

Returns navigation methods.

```js
import { useRouter } from '../composables/useRouter.js'

function MyPage() {
  const router = useRouter()

  return html`
    <button @click="${() => router.go('/users')}">Users</button>
    <button @click="${() => router.back()}">Back</button>
    <button @click="${() => router.forward()}">Forward</button>
  `
}
```

| Method | Description |
|---|---|
| `router.go(path)` | Navigate to a path; returns a Promise that resolves when navigation completes |
| `router.back()` | Navigate back in history |
| `router.forward()` | Navigate forward in history |

Uses the browser's [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) internally.

---

## `useForm(initialValues, options)`

Manages form state, validation, and submission. **Must be called inside a page function** — not at module scope — so state resets on each navigation.

```js
import { useForm } from '../composables/useForm.js'

function LoginPage() {
  const { form, handleSubmit, field } = useForm(
    { email: '', password: '' },
    {
      validate(values) {
        const errors = {}
        if (!values.email) errors.email = 'Email is required.'
        return errors
      },
      async onSubmit(values, form) {
        await loginUser(values)
        form.message = `Signed in as ${values.email}`
      },
    }
  )

  const emailField = field('email')

  return html`
    <form @submit="${handleSubmit}">
      <input type="email" @input="${emailField.set}" />
      ${() => emailField.error() ? html`<p>${() => emailField.error()}</p>` : ''}
      <button
        type="submit"
        aria-disabled="${() => form.submitting ? 'true' : 'false'}"
        class="${() => form.submitting ? 'opacity-50 cursor-not-allowed' : ''}"
      >${() => form.submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p>${() => form.message}</p>
  `
}
```

**`useForm` returns:**

| Value | Description |
|---|---|
| `form` | Reactive state object (see below) |
| `handleSubmit` | Event handler — attach to `@submit` on the form element |
| `field(name)` | Returns `{ get, set, error }` accessors for a named field |

**`form` properties:**

| Property | Type | Description |
|---|---|---|
| `form.values` | object | Current field values |
| `form.errors` | object | Validation errors keyed by field name |
| `form.submitting` | boolean | `true` while `onSubmit` is running |
| `form.submitted` | boolean | `true` after a successful submission |
| `form.message` | string | Set inside `onSubmit` to display a status message |

**`field(name)` accessors:**

| Accessor | Usage |
|---|---|
| `field.get()` | Reactive getter — use in `${}` slots |
| `field.set` | Input event handler — attach to `@input` |
| `field.error()` | Reactive error string or `undefined` |

---

## `provide` / `inject`

App-level dependency injection for passing configuration or services down to any layout or component without prop-drilling.

**Provide in `src/main.js`:**

```js
import { provide } from './framework/index.js'

provide('app', { name: 'My App', tagline: 'Built with Quiver' })
```

**Inject inside a layout or component function:**

```js
import { inject } from '../framework/index.js'

export function MenuLayout(content) {
  const app = inject('app', { name: 'Quiver', tagline: '' })
  // use app.name, app.tagline ...
}
```

`inject` must be called inside the function body, not at module scope — calling it at the top level of a file creates a circular import dependency.

The second argument to `inject` is the fallback value used when no matching `provide` call exists.
