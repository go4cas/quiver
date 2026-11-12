# useForm

Form state, validation and submit handling on one `reactive()` object. Only `@arrow-js/core` is imported (no Quiver), so plain Arrow apps can use it too.

## Install

Copy `useForm.js` to `src/composables/` (or `/add-composable useForm`).

## Use

Call it inside a page or component function, so each render gets fresh state:

```js
import { useForm } from '../composables/useForm.js'

const { form, handleSubmit, field } = useForm({ email: '' }, {
  validate: (v) => (v.email.includes('@') ? {} : { email: 'Enter an email address' }),
  onSubmit: async (values) => { await save(values) },
})
const email = field('email')

html`
  <form @submit="${handleSubmit}">
    <input value="${() => email.get()}" @input="${email.set}" />
    <p>${() => email.error() ?? ''}</p>
    <button aria-disabled="${() => String(form.submitting)}">Save</button>
    <p>${() => form.message}</p>
  </form>
`
```

- `validate` may be sync or async; return `{}` when valid or `{ field: 'message' }`.
- A second submit while one is running is ignored (`form.submitting`).
- A throwing or rejecting `validate` or `onSubmit` is caught and its message written to `form.message`; `form.submitting` goes back to `false`, so the user can fix things and submit again. `onSubmit` may also set `form.errors` itself (server-side errors), which keeps `form.submitted` false.
- Each submit starts by clearing `form.submitted` and `form.message`. `validate` and `onSubmit` get the same deep copy of the values, taken when the submit starts and sharing nothing with `form`, so an edit made while an async `validate` runs, nested fields included, is neither validated late nor submitted unvalidated; it stays in `form.values` for the next submit. Supported values are strings, numbers, booleans, bigints, `null`, `undefined`, and plain objects and arrays of them. Anything else (a `Date`, `Map`, `Set`, `File`, class instance or function) stops the submit before `validate` runs, with a `useForm: form values must be …` message in `form.message`: keep such values outside `form.values`, or store a string (an ISO date, a file name) instead.
- For schema validation, call your validator (Zod, Valibot…) inside `validate` and map its issues to `{ field: message }`.
