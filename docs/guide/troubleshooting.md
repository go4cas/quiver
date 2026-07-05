# Troubleshooting

The most common issues, in rough order of how often they bite. Most of them are Arrow.js rules that break silently — skim this page once before you build your first feature.

## The UI renders once but never updates

**Cause:** a `${}` slot with a bare value. Arrow.js only tracks dependencies inside functions — a bare value is read once at render time.

```js
// Static — renders once, never updates
html`<p>${userState.users.length}</p>`

// Reactive — re-evaluates whenever userState.users changes
html`<p>${() => userState.users.length}</p>`
```

Wrap every slot that references changing state in `() =>`. Static strings and constants are fine bare.

## `Uncaught Error: Invalid HTML position`

**Cause:** an HTML comment inside an `` html`...` `` template. Arrow.js uses comment nodes internally as slot markers, and your comment collides with them.

```js
// Throws
html`
  <!-- user info -->
  <p>${() => user.name}</p>
`

// Fine — comment outside the template literal
// user info
html`<p>${() => user.name}</p>`
```

## A "disabled" button still fires clicks

**Cause:** `.disabled="${...}"` sets a literal attribute named `.disabled`, not the DOM `disabled` property. The button looks normal and stays clickable.

```js
// Wrong — sets attribute ".disabled", button still fires click events
html`<button .disabled="${() => form.submitting}">Submit</button>`

// Correct — aria-disabled + guard in the handler or CSS
html`
  <button
    aria-disabled="${() => form.submitting ? 'true' : 'false'}"
    class="${() => form.submitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}"
  >Submit</button>
`
```

## List items flicker, lose focus, or reset state

**Cause:** a `.map()` in a template without `.key()`. Arrow re-creates every DOM node on each change unless items are keyed.

```js
html`${() => users.map((user) => UserCard({ user }).key(user.id))}`
```

Use a stable unique value — an id, not the array index.

## `Navigation API is not supported in this browser.`

**Cause:** Quiver's router requires the Navigation API. Supported in Chrome/Edge 102+, Safari 26.2+, and Firefox 147+ — there is no fallback for older browsers. See the [browser support table](./getting-started#browser-support).

## Two component instances share state in dev mode

**Cause:** two `hmrState()` calls with the same key. The key must be unique per component instance on the page, or their state is linked across hot reloads.

```js
// Wrong — every Counter shares one HMR slot
const state = hmrState('counter', { count: 0 })

// Correct — derive the key from a unique prop
const state = hmrState(`counter-${props.label}`, { count: 0 })
```

This only affects development (Vite HMR); production is unaffected.

## `useRoute()` / `useForm()` return stale or shared state

**Cause:** calling a composable at module scope. Composables must be called inside a page or component function so each render gets fresh state.

```js
// Wrong — module scope, created once for the lifetime of the app
const form = useForm({ email: '' })
export default function LoginPage() { ... }

// Correct — inside the page function
export default function LoginPage() {
  const { form, handleSubmit, field } = useForm({ email: '' })
  ...
}
```

## `npm run dev` fails with a Node error

**Cause:** Node older than 20.19. Vite 8 requires Node 20.19+ (see [prerequisites](./getting-started#prerequisites)). Check with `node --version` and upgrade via your version manager.

## Still stuck?

[Open an issue](https://github.com/go4cas/quiver/issues) with the error message and a snippet — small reproductions get fast answers.
