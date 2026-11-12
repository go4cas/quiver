# Composables

A composable is a function you call inside a page or component that hands back reactive getters and actions. Quiver's come from three places:

| From | Composables | Needs |
|---|---|---|
| [`@go4cas/quiver`](/api/core) | `useRoute()`, `useRouter()`, `useMeta()` | the router |
| [`arrow-use`](/arrow-use/) | `useFetch()`, `useStorage()`, `useMediaQuery()`, `useEventListener()` | only `@arrow-js/core` |
| [recipes](/recipes/) (installed into `src/components/` and `src/composables/`) | `useToast()`, `useForm()`, `hmrState()` | only `@arrow-js/core` |

Before writing your own, check these: use `useFetch` for API calls instead of a hand-rolled fetch with loading and error state, `useToast` for notifications instead of an ad-hoc banner, and `useStorage`, `useMediaQuery` and `useEventListener` instead of wiring `localStorage`, `matchMedia` or `addEventListener` by hand.

## Route and navigation

```js
import { useRoute, useRouter, useMeta } from '@go4cas/quiver'

export default function UserPage() {
  const route = useRoute()      // path(), params(), status(), meta()
  const router = useRouter()    // go(path), back(), forward()
  useMeta({ title: () => `User ${route.params().id}` })

  return html`
    <h1>User ${() => route.params().id}</h1>
    <button @click="${() => router.back()}">Back</button>
  `
}
```

Details in [Routing](./routing#reading-the-route) and the [API reference](/api/core#useroute).

## Data, storage, media queries, events: `arrow-use`

```js
import { useFetch, useStorage, useMediaQuery, useEventListener } from 'arrow-use'

const posts = useFetch('/api/posts', { transform: (all) => all.slice(0, 10) })
html`
  ${() => (posts.loading() ? html`<p>Loading…</p>` : html``)}
  ${() => (posts.error() ? html`<p role="alert">${posts.error()}</p>` : html``)}
  <ul>${() => (posts.data() ?? []).map((p) => html`<li>${p.title}</li>`.key(p.id))}</ul>
  <button @click="${() => posts.refetch()}">Refresh</button>
`
```

Every `arrow-use` composable returns getters plus `stop()`, cleans up when its `component()` unmounts or, called in a page or layout function, when the page is left (a `component()` nested inside a page's template is the exception: [why](./troubleshooting#cleanup-never-runs)), and can be imported on a server or in tests. One page per composable: [`useFetch`](/arrow-use/useFetch), [`useStorage`](/arrow-use/useStorage), [`useMediaQuery`](/arrow-use/useMediaQuery), [`useEventListener`](/arrow-use/useEventListener).

## Toasts, forms, hot-reload state: recipes

These are files in your app, not package exports. Install them with `/add-component toast` and `/add-composable useForm` (or by hand, see [recipes](/recipes/#installing-a-recipe)), then import them from where they were installed:

```js
import { useToast } from '../components/Toasts.js'
import { useForm } from '../composables/useForm.js'

export default function ProfilePage() {
  const toast = useToast()
  const { form, handleSubmit, field } = useForm({ email: '' }, {
    validate: (v) => (v.email.includes('@') ? {} : { email: 'Enter an email address' }),
    onSubmit: async (values) => {
      await api.saveProfile(values)
      toast.success('Profile saved.')
    },
  })
  const email = field('email')

  return html`
    <form @submit="${handleSubmit}">
      <label>Email <input value="${() => email.get()}" @input="${email.set}" /></label>
      <p role="alert">${() => email.error() ?? ''}</p>
      <button aria-disabled="${() => String(form.submitting)}">Save</button>
    </form>
  `
}
```

See [`toasts`](/recipes/toasts), [`useForm`](/recipes/useForm) and [`hmrState`](/recipes/hmrState).

## Writing your own

`/add-composable useName` scaffolds one in `src/composables/` with a unit test. Follow the same rules as `arrow-use`, and it will compose with everything above:

```js
// src/composables/useCounter.js
import { reactive } from '@arrow-js/core'

/**
 * @param {number} [initial]
 * @returns {{ count: () => number, increment: () => void, stop: () => void }}
 */
export function useCounter(initial = 0) {
  const state = reactive({ count: initial })
  return {
    count: () => state.count,          // getters, so callers stay reactive
    increment: () => { state.count++ },
    stop: () => {},                    // release listeners, timers, requests
  }
}
```

1. Return getters, not raw values or the `reactive()` object.
2. Return `stop()` that releases whatever the composable holds, and register it with `try { onCleanup(stop) } catch {}`, since `onCleanup` throws outside a component.
3. Touch no browser API at import time; check `window`, `fetch` or `localStorage` when the function is called.
4. Required arguments first, then one `options = {}` object.

The [`arrow-use` overview](/arrow-use/#conventions) has the full list.

## Where to call them

Inside the page or component function, not at module scope: each page render then gets fresh state, and cleanup ties to the component. The exception is shared state, such as a module-level `useStorage` singleton ([State](./state#persisted-state)).
