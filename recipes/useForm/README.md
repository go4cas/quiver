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
- Each submit starts by clearing `form.submitted` and `form.message`. `validate` and `onSubmit` get the same copy of `form.values`, taken when the submit starts, so a value typed while an async validator runs is not submitted unvalidated.
- For schema validation, call your validator (Zod, Valibot…) inside `validate` and map its issues to `{ field: message }`.
