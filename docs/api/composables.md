# Composables API

Functions in `src/composables/`. Call them inside page or component functions — not at module scope.

---

## `useRoute()`

Returns reactive accessor functions for the current route state.

**Source:** `src/composables/useRoute.js`

```js
import { useRoute } from '../composables/useRoute.js'

function UserDetailPage() {
  const route = useRoute()

  return html`
    <p>Path: ${() => route.path()}</p>
    <p>ID: ${() => route.params().id}</p>
  `
}
```

**Returns:** `{ path, params, status, meta }`

| Property | Type | Description |
|---|---|---|
| `path` | `() => string` | Current URL path |
| `params` | `() => object` | Dynamic route params, e.g. `{ id: '42' }` |
| `status` | `() => string` | Router status: `'idle'` · `'loading'` · `'ready'` · `'not-found'` · `'error'` |
| `meta` | `() => object` | The `meta` object exported by the current page module |

Each property is a function — call it inside a `${}` template slot so Arrow.js can track it reactively.

---

## `useRouter()`

Returns navigation methods backed by the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API).

**Source:** `src/composables/useRouter.js`

```js
import { useRouter } from '../composables/useRouter.js'

function MyPage() {
  const router = useRouter()

  return html`
    <button @click="${() => router.go('/users')}">Users</button>
    <button @click="${() => router.back()}">Back</button>
  `
}
```

**Returns:** `{ go, back, forward }`

| Method | Signature | Description |
|---|---|---|
| `go` | `(path: string) => Promise<void>` | Navigate to a path; normalises trailing slashes |
| `back` | `() => Promise<void>` | Navigate back in the session history |
| `forward` | `() => Promise<void>` | Navigate forward in the session history |

---

## `useForm(initialValues, options?)`

Manages form field values, validation, submission state, and error display.

**Must be called inside a page function** — not at module scope. Calling it inside the function ensures state resets each time the page is mounted.

**Source:** `src/composables/useForm.js`

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
        await authenticate(values)
        form.message = `Signed in as ${values.email}`
      },
    }
  )

  const emailField = field('email')

  return html`
    <form @submit="${handleSubmit}">
      <input type="email" @input="${emailField.set}" />
      ${() => emailField.error()
        ? html`<p class="text-rose-600">${() => emailField.error()}</p>`
        : ''}
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

**Parameters**

| Name | Type | Description |
|---|---|---|
| `initialValues` | `object` | Initial values for each field, keyed by field name |
| `options.validate` | `(values) => object` | Called before submit. Return an object of `{ fieldName: errorMessage }` to block submission. |
| `options.onSubmit` | `async (values, form) => void` | Called on successful validation. Receives the current values and the reactive `form` object. |

**Returns:** `{ form, handleSubmit, field }`

### `form`

Reactive state object.

| Property | Type | Description |
|---|---|---|
| `form.values` | `object` | Current field values |
| `form.errors` | `object` | Validation errors keyed by field name |
| `form.submitting` | `boolean` | `true` while `onSubmit` is awaiting |
| `form.submitted` | `boolean` | `true` after a successful submission |
| `form.message` | `string` | Set inside `onSubmit` to display a status or success message |

### `handleSubmit`

An event handler function. Attach it to `@submit` on the `<form>` element. It calls `e.preventDefault()`, runs validation, and invokes `onSubmit` on success.

### `field(name)`

Returns a set of accessors for a named field.

| Accessor | Type | Description |
|---|---|---|
| `get` | `() => string` | Reactive getter for the field's current value |
| `set` | `(event) => void` | Input event handler — reads `event.target.value` |
| `error` | `() => string \| undefined` | Reactive getter for the field's validation error |
