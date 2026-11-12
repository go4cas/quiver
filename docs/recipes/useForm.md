# useForm

Form state, validation and submit handling on one `reactive()` object. Imports only `@arrow-js/core`.

| | |
|---|---|
| Command | `/add-composable useForm` (aliases: `form`, `use-form`) |
| Installs | `src/composables/useForm.js` |
| CSS | none |
| Needs | nothing |
| Tokens | none |

## Use

Call it inside the page or component function, so each render gets fresh state:

```js
import { html } from '@arrow-js/core'
import { useForm } from '../composables/useForm.js'

export default function SignupPage() {
  const { form, handleSubmit, field } = useForm({ email: '', name: '' }, {
    validate: async (values) => {
      const errors = {}
      if (!values.email.includes('@')) errors.email = 'Enter an email address.'
      if (!values.name) errors.name = 'Enter your name.'
      return errors
    },
    onSubmit: async (values, form) => {
      await api.signup(values)
      form.message = `Welcome, ${values.name}.`
    },
  })
  const email = field('email')

  return html`
    <form @submit="${handleSubmit}">
      <label>Email <input type="email" value="${() => email.get()}" @input="${email.set}" /></label>
      <p role="alert">${() => email.error() ?? ''}</p>
      <button aria-disabled="${() => String(form.submitting)}">
        ${() => (form.submitting ? 'Signing up…' : 'Sign up')}
      </button>
      <p>${() => form.message}</p>
    </form>
  `
}
```

```ts
useForm(initialValues?: object, options?: { validate?, onSubmit? }): { form, handleSubmit, field }
```

| Option | |
|---|---|
| `validate(values)` | sync or async; return `{}` when valid, `{ field: 'message' }` otherwise |
| `onSubmit(values, form)` | runs after validation passes; may be async |

| Returned | |
|---|---|
| `form` | reactive: `values`, `errors`, `submitting`, `submitted`, `message` |
| `handleSubmit` | the `@submit` handler: prevents the default, validates, runs `onSubmit` |
| `field(name)` | `{ get(), set, error() }` for one field: `set` is an `@input` handler |

## Behaviour

- A second submit while one is running is ignored (`form.submitting`).
- A throwing or rejecting `validate` or `onSubmit` is caught, its message goes to `form.message`, and `form.submitting` goes back to `false`, so the user can submit again.
- Each submit clears `form.submitted` and `form.message` first. `validate` and `onSubmit` get the same deep copy of the values, taken when the submit starts and sharing nothing with `form`, so an edit made while an async `validate` runs, nested fields included, is neither validated late nor submitted unvalidated; it stays in `form.values` for the next submit. Supported values are strings, numbers, booleans, bigints, `null`, `undefined`, and plain objects and arrays of them. Anything else (a `Date`, `Map`, `Set`, `File`, class instance or function) stops the submit before `validate` runs, with a `useForm: form values must be …` message in `form.message`: keep such values outside `form.values`, or store a string (an ISO date, a file name) instead.
- `onSubmit` may set `form.errors` itself (errors from the server), which keeps `form.submitted` false.
- For schema validation, call Zod, Valibot or similar inside `validate` and map the issues to `{ field: message }`.
