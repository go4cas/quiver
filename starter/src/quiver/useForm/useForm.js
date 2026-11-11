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
    // Guard the async validate window too: submitting goes true before any await,
    // so a second submit while this one runs is ignored.
    form.submitting = true
    // A new attempt starts clean: no stale success flag or message.
    form.submitted = false
    form.message = ''
    // validate() and onSubmit() see the same snapshot, so a value typed while an
    // async validator runs isn't submitted unvalidated.
    const values = { ...form.values }

    // validate() and onSubmit() share one try/finally, so a throwing or rejecting
    // validator can't leave the form stuck in submitting (audit R07, N140).
    try {
      if (validate) {
        // validate may be sync or async — await handles both.
        const errs = await validate(values)
        if (errs && Object.keys(errs).length) {
          form.errors = errs
          return
        }
      }

      form.errors = {}
      if (onSubmit) await onSubmit(values, form)
      if (!Object.keys(form.errors).length) form.submitted = true
    } catch (err) {
      // @submit handlers discard the returned promise, so a throwing validate()
      // or onSubmit() would otherwise become an unhandled rejection with no UI
      // feedback — surface it as the form's status message instead.
      form.message = err instanceof Error ? err.message : String(err)
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
