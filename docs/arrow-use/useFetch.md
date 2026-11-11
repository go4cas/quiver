# useFetch

Fetches JSON and exposes the request as reactive getters: the data, whether it's loading, the error, the HTTP status.

```js
import { useFetch } from 'arrow-use'
```

```ts
useFetch(url: string, options?: UseFetchOptions): UseFetchReturn
```

## Example

```js
import { component, html } from '@arrow-js/core'
import { useFetch } from 'arrow-use'

export const Posts = component(() => {
  const posts = useFetch('https://jsonplaceholder.typicode.com/posts', {
    transform: (all) => all.slice(0, 10),
  })

  return html`
    ${() => (posts.loading() ? html`<p>Loading…</p>` : html``)}
    ${() => (posts.error() ? html`<p role="alert">Could not load posts: ${posts.error()}</p>` : html``)}
    <ul>
      ${() => (posts.data() ?? []).map((post) => html`<li>${post.title}</li>`.key(post.id))}
    </ul>
    <button @click="${() => posts.refetch()}">Refresh</button>
  `
})
```

A request on demand, with other `fetch` options:

```js
const save = useFetch('/api/profile', {
  immediate: false,
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(profile),
})
await save.refetch()
if (save.error()) toast.error(save.error())
```

## Options

| Option | Type | Default | |
|---|---|---|---|
| `immediate` | `boolean` | `true` | start the request when `useFetch` is called |
| `transform` | `(raw: any) => any` | none | maps the parsed JSON before it reaches `data()`; synchronous: a returned promise is stored as `data()`, not awaited |
| any `RequestInit` field | | | passed to `fetch`: `method`, `headers`, `body`, `credentials`, `signal`, … |

A `signal` you pass is combined with the composable's own, so either can abort the request.

## Returns

| Member | Type | |
|---|---|---|
| `data()` | `any` | parsed (and transformed) JSON of the last successful response, else `null` |
| `loading()` | `boolean` | `true` while the current request is in flight |
| `error()` | `string \| null` | message of the last failure: `'HTTP 404'` for a non-2xx response, the network error's message, a JSON parse error; `null` on success |
| `status()` | `number \| null` | HTTP status of the last response |
| `refetch()` | `() => Promise<void>` | starts a new request, aborting the one in flight; resolves when it settles; does nothing after `stop()` |
| `reset()` | `() => void` | aborts the request in flight and clears `data`, `error`, `status` and `loading` |
| `stop()` | `() => void` | aborts the request in flight (`loading()` becomes `false`) and ignores later `refetch()` calls; idempotent |

## Behaviour

- **Superseded requests never write.** When `refetch()` starts a new request, the old one is aborted, and if its response still arrives, it's ignored. Only the newest request sets `data`, `status`, `error` and `loading`.
- **Errors are values, not exceptions.** `refetch()` never rejects; check `error()`. Whatever is thrown (by `fetch`, `res.json()` or your `transform`) becomes a string: an `Error`'s message, a thrown string itself, or `'Request failed'` for `null`, `undefined` or an object without a message.
- **An abort is not an error.** Cancelling through `refetch()`, `reset()`, `stop()`, unmounting or your own `signal` leaves `error()` as it was and sets `loading()` to `false`, whatever reason the signal was aborted with.
- **`transform` can't publish a stale result.** If `transform` calls `reset()`, `stop()` or `refetch()`, the value it returns is dropped.
- **`data()` is plain JSON**, not a reactive proxy. Templates re-render when a new response arrives, but mutating the object yourself doesn't re-render: call `refetch()`, or copy it into your own `reactive()`.
- **Cleanup.** Inside a `component()` that a slot drops, the request is aborted on unmount. Called in a Quiver 3.1+ page or layout function, it is aborted when the page is left and on `destroy()`, inside a layout too. In a `component()` nested inside another template, call `stop()` yourself if a request must not outlive it ([why](/guide/troubleshooting#cleanup-never-runs)).
- **Outside the browser.** `useFetch` uses the global `fetch`, so runtimes that have one (Node 18+, Bun, Deno) make real requests, for example during tests. Without a global `fetch`, nothing is requested: `data()` is `null` and `loading()` is `false`.
