# useForm

Form state, validation and submit handling on one `reactive()` object. Only `@arrow-js/core` is imported (no Quiver), so plain Arrow apps can use it too.

## Install

Copy `useForm.js` to `src/quiver/useForm/` (or `/add-composable useForm`).

## Use

Call it inside a page or component function, so each render gets fresh state:

```js
import { useForm } from '../quiver/useForm/useForm.js'

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
- A throwing `onSubmit` is caught and its message written to `form.message`; `onSubmit` may also set `form.errors` itself (server-side errors), which keeps `form.submitted` false.
- For schema validation, call your validator (Zod, Valibot…) inside `validate` and map its issues to `{ field: message }`.
