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

## `useFetch(url, options?)`

Fetches a JSON endpoint and exposes reactive `data`, `loading`, `error`, and `status` accessors. Uses `AbortController` to cancel in-flight requests on `refetch()` or component unmount.

**Must be called inside a page or `component()` factory** — not at module scope.

**Source:** `src/composables/useFetch.js`

```js
import { useFetch } from '../composables/useFetch.js'

function PostsPage() {
  const posts = useFetch('https://jsonplaceholder.typicode.com/posts', {
    transform: (data) => data.slice(0, 10),
  })

  return html`
    ${() => posts.loading() ? html`<p>Loading…</p>` : ''}
    ${() => posts.error()   ? html`<p>Error: ${() => posts.error()}</p>` : ''}
    ${() => (posts.data() ?? []).map((post) =>
      html`<h2>${() => post.title}</h2>`.key(post.id)
    )}
    <button @click="${() => posts.refetch()}">Refresh</button>
  `
}
```

**Parameters**

| Name | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | URL to fetch |
| `options.immediate` | `boolean` | `true` | Fetch on mount; `false` for manual-only trigger |
| `options.transform` | `(data) => any` | identity | Transform applied to parsed JSON before storing in `data` |
| `options.method` | `string` | `'GET'` | HTTP method |
| `options.headers` | `object` | `{}` | Request headers |
| `options.body` | `string` | — | Request body |
| `options.delay` | `number` | `0` | Artificial delay in ms applied after the response resolves — useful for demoing loading/skeleton states |

**Returns**

| Name | Type | Description |
|---|---|---|
| `data()` | `() => any \| null` | Reactive accessor — parsed JSON response (or transformed value); `null` until the first successful fetch |
| `loading()` | `() => boolean` | Reactive accessor — `true` while a request is in flight |
| `error()` | `() => string \| null` | Reactive accessor — error message string on failure; `null` on success or before the first attempt |
| `status()` | `() => number \| null` | Reactive accessor — HTTP status code of the last response; `null` before the first attempt |
| `refetch()` | `() => Promise<void>` | Re-triggers the fetch; aborts any in-flight request before starting a new one |
| `reset()` | `() => void` | Aborts any in-flight request and clears `data`, `error`, `status`, and `loading` |

---

## `useToast()`

Returns shortcut methods for triggering global toast notifications via `toastState`.

**Source:** `src/composables/useToast.js`

```js
import { useToast } from '../composables/useToast.js'

function MyPage() {
  const toast = useToast()

  return html`
    <button @click="${() => toast.success('Saved!')}">Save</button>
    <button @click="${() => toast.error('Failed.', { duration: 0 })}">Fail</button>
  `
}
```

**Returns:** `{ success, error, warning, info, dismiss }`

| Method | Signature | Description |
|---|---|---|
| `success` | `(msg, opts?) => string` | Add a success toast; returns its id |
| `error` | `(msg, opts?) => string` | Add an error toast; returns its id |
| `warning` | `(msg, opts?) => string` | Add a warning toast; returns its id |
| `info` | `(msg, opts?) => string` | Add an info toast; returns its id |
| `dismiss` | `(id) => void` | Immediately remove the toast with the given id |

**`opts` object**

| Name | Type | Default | Description |
|---|---|---|---|
| `duration` | `number` | `toastState.config.duration` (4000) | Auto-dismiss delay in ms; `0` = never auto-dismiss |
| `dismissible` | `boolean` | `toastState.config.dismissible` (true) | Whether to render a close button on the toast |

**Global defaults** can be changed at any time via `toastState.configure({ position, duration, dismissible })`. Defaults apply to all subsequent calls unless overridden per-call.

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
| `options.validate` | `(values) => object \| Promise<object>` | Called before submit — may be sync or async (it is awaited). Return an object of `{ fieldName: errorMessage }` to block submission, or an empty object to allow it. |
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
| `form.message` | `string` | Set inside `onSubmit` to display a status or success message; if `onSubmit` throws, the error message is written here |

### `handleSubmit`

An event handler function. Attach it to `@submit` on the `<form>` element. It calls `e.preventDefault()`, runs validation, and invokes `onSubmit` on success.

### `field(name)`

Returns a set of accessors for a named field.

| Accessor | Type | Description |
|---|---|---|
| `get` | `() => string` | Reactive getter for the field's current value |
| `set` | `(event) => void` | Input event handler — reads `event.target.value` |
| `error` | `() => string \| undefined` | Reactive getter for the field's validation error |
