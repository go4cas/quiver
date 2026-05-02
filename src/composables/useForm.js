import { reactive } from '@arrow-js/core'

// useForm(initialValues, { onSubmit, validate })
// Returns { form, handleSubmit, field(name) }
//
// Call inside a page/component function — NOT at module level — so state resets each render.
//
// field(name) returns:
//   get  — () => current value (reactive)
//   set  — (event) => update from input event
//   error — () => validation error string or undefined
export function useForm(initialValues = {}, { onSubmit, validate } = {}) {
  const form = reactive({
    values: { ...initialValues },
    errors: {},
    submitting: false,
    submitted: false,
    message: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.submitting) return

    if (validate) {
      const errs = validate(form.values)
      if (errs && Object.keys(errs).length) {
        form.errors = errs
        return
      }
    }

    form.errors = {}
    form.submitting = true

    try {
      if (onSubmit) await onSubmit(form.values, form)
      if (!Object.keys(form.errors).length) form.submitted = true
    } finally {
      form.submitting = false
    }
  }

  const field = (name) => ({
    get: () => form.values[name],
    set: (e) => { form.values[name] = e.target.value },
    error: () => form.errors[name],
  })

  return { form, handleSubmit, field }
}
