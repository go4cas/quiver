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
/**
 * @typedef {Record<string, any>} FormValues
 * @typedef {Record<string, string>} FormErrors
 * @typedef {{ values: FormValues, errors: FormErrors, submitting: boolean, submitted: boolean, message: string }} FormState
 */
/**
 * @param {FormValues} [initialValues]
 * @param {{
 *   onSubmit?: (values: FormValues, form: FormState) => any,
 *   validate?: (values: FormValues) => FormErrors | Promise<FormErrors> | undefined,
 * }} [options]
 */
export function useForm(initialValues = {}, { onSubmit, validate } = {}) {
  const form = reactive(/** @type {FormState} */ ({
    values: { ...initialValues },
    errors: {},
    submitting: false,
    submitted: false,
    message: '',
  }))

  /** @param {{ preventDefault: () => void }} e */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.submitting) return

    if (validate) {
      // validate may be sync or async — await handles both.
      const errs = await validate(form.values)
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

  /** @param {string} name */
  const field = (name) => ({
    get: () => form.values[name],
    set: /** @param {{ target: { value: any } }} e */ (e) => { form.values[name] = e.target.value },
    error: () => form.errors[name],
  })

  return { form, handleSubmit, field }
}
