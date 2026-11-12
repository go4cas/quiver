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
 * A deep copy of the form's values that shares nothing with `form` (audit R32-09,
 * N221). Arrow wraps every nested object of a reactive() in a proxy, which
 * structuredClone() refuses, so plain objects and arrays are copied out first;
 * structuredClone() then copies that and throws on anything else. Supported
 * values: strings, numbers, booleans, bigint, null, undefined, and plain objects
 * and arrays of them. A Date, Map, Set, File, class instance or function throws.
 * @param {FormValues} values
 * @returns {FormValues}
 */
function snapshot(values) {
  const seen = new Map()
  /** @param {any} value @returns {any} */
  const unwrap = (value) => {
    if (value === null || typeof value !== 'object') return value
    if (seen.has(value)) return seen.get(value)
    if (Array.isArray(value)) {
      const copy = /** @type {any[]} */ ([])
      seen.set(value, copy)
      for (const item of value) copy.push(unwrap(item))
      return copy
    }
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== null) return value
    const copy = /** @type {Record<string, any>} */ ({})
    seen.set(value, copy)
    for (const key of Object.keys(value)) copy[key] = unwrap(value[key])
    return copy
  }
  try {
    return structuredClone(unwrap(values))
  } catch {
    throw new TypeError('useForm: form values must be strings, numbers, booleans, null, or plain objects and arrays of them')
  }
}

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
    // validate() and onSubmit() share one try/finally, so a throwing or rejecting
    // validator, or a value the snapshot can't copy, can't leave the form stuck in
    // submitting (audit R07, N140).
    try {
      // validate() and onSubmit() see the same deep snapshot, so a value typed
      // while an async validator runs, even in a nested field, isn't submitted
      // unvalidated; it stays in form.values for the next submit (R32-09).
      const values = snapshot(form.values)

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
