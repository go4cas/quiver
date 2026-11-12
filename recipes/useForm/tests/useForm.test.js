import { describe, it, expect, vi } from 'vitest'
import { useForm } from '../useForm.js'

function fakeSubmitEvent() {
  return { preventDefault: vi.fn() }
}

function fakeInputEvent(value) {
  return { target: { value } }
}

describe('useForm — initial state', () => {
  it('exposes reactive form state', () => {
    const { form } = useForm({ email: '' })
    expect(form.values.email).toBe('')
    expect(form.errors).toEqual({})
    expect(form.submitting).toBe(false)
    expect(form.submitted).toBe(false)
  })
})

describe('useForm — field accessor', () => {
  it('get() returns the current value', () => {
    const { field } = useForm({ name: 'Alice' })
    expect(field('name').get()).toBe('Alice')
  })

  it('set() updates the value from an input event', () => {
    const { form, field } = useForm({ name: '' })
    field('name').set(fakeInputEvent('Bob'))
    expect(form.values.name).toBe('Bob')
  })

  it('error() returns undefined when no error', () => {
    const { field } = useForm({ name: '' })
    expect(field('name').error()).toBeUndefined()
  })

  it('error() returns the error string when present', () => {
    const { form, field } = useForm({ name: '' })
    form.errors = { name: 'Name is required.' }
    expect(field('name').error()).toBe('Name is required.')
  })
})

describe('useForm — validation', () => {
  it('blocks submit and sets errors when validate() returns errors', async () => {
    const onSubmit = vi.fn()
    const { form, handleSubmit } = useForm(
      { email: '' },
      {
        validate: (v) => (v.email ? {} : { email: 'Required.' }),
        onSubmit,
      }
    )
    await handleSubmit(fakeSubmitEvent())
    expect(form.errors.email).toBe('Required.')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(form.submitted).toBe(false)
  })

  it('clears previous errors before a valid submit', async () => {
    const { form, handleSubmit } = useForm(
      { email: 'a@b.com' },
      { validate: () => ({}) }
    )
    form.errors = { email: 'Old error' }
    await handleSubmit(fakeSubmitEvent())
    expect(form.errors.email).toBeUndefined()
  })

  it('awaits an async validate() and blocks submit on errors', async () => {
    const onSubmit = vi.fn()
    const { form, handleSubmit } = useForm(
      { email: '' },
      {
        validate: async (v) => (v.email ? {} : { email: 'Required.' }),
        onSubmit,
      }
    )
    await handleSubmit(fakeSubmitEvent())
    expect(form.errors.email).toBe('Required.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('proceeds to onSubmit when validate() returns empty object', async () => {
    const onSubmit = vi.fn()
    const { handleSubmit } = useForm(
      { email: 'a@b.com' },
      { validate: () => ({}), onSubmit }
    )
    await handleSubmit(fakeSubmitEvent())
    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.com' }, expect.any(Object))
  })

  it('proceeds to onSubmit when no validate option is provided', async () => {
    const onSubmit = vi.fn()
    const { handleSubmit } = useForm({ x: '1' }, { onSubmit })
    await handleSubmit(fakeSubmitEvent())
    expect(onSubmit).toHaveBeenCalled()
  })
})

describe('useForm — submission lifecycle', () => {
  it('sets form.submitted to true on success', async () => {
    const { form, handleSubmit } = useForm({ x: '' }, { onSubmit: vi.fn() })
    await handleSubmit(fakeSubmitEvent())
    expect(form.submitted).toBe(true)
  })

  it('does not set form.submitted when onSubmit sets errors', async () => {
    const { form, handleSubmit } = useForm(
      { email: '' },
      {
        onSubmit: (_, f) => { f.errors = { email: 'Not found.' } },
      }
    )
    await handleSubmit(fakeSubmitEvent())
    expect(form.submitted).toBe(false)
    expect(form.errors.email).toBe('Not found.')
  })

  it('resets form.submitting to false after success', async () => {
    const { form, handleSubmit } = useForm({ x: '' }, { onSubmit: vi.fn() })
    await handleSubmit(fakeSubmitEvent())
    expect(form.submitting).toBe(false)
  })

  it('surfaces a throwing onSubmit as form.message and resets submitting', async () => {
    const { form, handleSubmit } = useForm(
      { x: '' },
      { onSubmit: () => { throw new Error('Server error') } }
    )
    await handleSubmit(fakeSubmitEvent()) // resolves — no unhandled rejection
    expect(form.message).toBe('Server error')
    expect(form.submitted).toBe(false)
    expect(form.submitting).toBe(false)
  })

  it('calls preventDefault on the submit event', async () => {
    const e = fakeSubmitEvent()
    const { handleSubmit } = useForm({})
    await handleSubmit(e)
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('ignores a second submit while an async validate is pending', async () => {
    /** @type {(errs: object) => void} */
    let resolveValidate
    const validate = vi.fn(() => new Promise((r) => { resolveValidate = r }))
    const onSubmit = vi.fn()
    const { handleSubmit } = useForm({ x: '' }, { validate, onSubmit })

    const first = handleSubmit(fakeSubmitEvent())
    handleSubmit(fakeSubmitEvent()) // fired while validate is still pending
    expect(validate).toHaveBeenCalledTimes(1)

    resolveValidate({})
    await first
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('resets submitting when async validate fails', async () => {
    const { form, handleSubmit } = useForm(
      { email: '' },
      { validate: async () => ({ email: 'Required.' }) }
    )
    await handleSubmit(fakeSubmitEvent())
    expect(form.submitting).toBe(false)
    expect(form.errors.email).toBe('Required.')
  })

  it('ignores a second submit while already submitting', async () => {
    let resolveSubmit
    const onSubmit = vi.fn(() => new Promise((r) => { resolveSubmit = r }))
    const { handleSubmit } = useForm({ x: '' }, { onSubmit })

    // Fire twice without awaiting the first
    handleSubmit(fakeSubmitEvent())
    handleSubmit(fakeSubmitEvent())

    resolveSubmit()
    await new Promise((r) => setTimeout(r, 0))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('useForm — validator failures (audit R07, N140)', () => {
  it('a throwing validate() releases submitting, sets form.message, and a retry succeeds', async () => {
    let fail = true
    const onSubmit = vi.fn()
    const { form, handleSubmit } = useForm(
      { x: '1' },
      { validate: () => { if (fail) throw new Error('Validator crashed'); return {} }, onSubmit }
    )
    await handleSubmit(fakeSubmitEvent()) // resolves — no unhandled rejection
    expect(form.submitting).toBe(false)
    expect(form.message).toBe('Validator crashed')
    expect(form.submitted).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()

    fail = false
    await handleSubmit(fakeSubmitEvent())
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(form.submitted).toBe(true)
    expect(form.message).toBe('') // the stale message clears on a new attempt
  })

  it('a rejecting async validate() releases submitting and a retry succeeds', async () => {
    let fail = true
    const onSubmit = vi.fn()
    const { form, handleSubmit } = useForm(
      { x: '1' },
      { validate: async () => { if (fail) throw 'offline'; return {} }, onSubmit }
    )
    await handleSubmit(fakeSubmitEvent())
    expect(form.submitting).toBe(false)
    expect(form.message).toBe('offline')
    expect(onSubmit).not.toHaveBeenCalled()

    fail = false
    await handleSubmit(fakeSubmitEvent())
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(form.submitting).toBe(false)
  })

  it('submits the values that were validated, not ones typed during an async validate()', async () => {
    /** @type {(errs: object) => void} */
    let resolveValidate = () => {}
    const validate = vi.fn(() => new Promise((r) => { resolveValidate = r }))
    const onSubmit = vi.fn()
    const { field, handleSubmit } = useForm({ email: 'a@b.com' }, { validate, onSubmit })

    const pending = handleSubmit(fakeSubmitEvent())
    field('email').set(fakeInputEvent('not-validated'))
    resolveValidate({})
    await pending
    expect(validate).toHaveBeenCalledWith({ email: 'a@b.com' })
    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.com' }, expect.any(Object))
  })

  it('a new attempt clears form.submitted from the last success', async () => {
    let valid = true
    const { form, handleSubmit } = useForm(
      { x: '' },
      { validate: () => (valid ? {} : { x: 'Required.' }), onSubmit: vi.fn() }
    )
    await handleSubmit(fakeSubmitEvent())
    expect(form.submitted).toBe(true)
    valid = false
    await handleSubmit(fakeSubmitEvent())
    expect(form.submitted).toBe(false)
    expect(form.errors.x).toBe('Required.')
  })
})

describe('useForm — deep snapshot (audit R32-09, N221)', () => {
  it('validate() and onSubmit() see the same nested values when a nested field changes mid-validate', async () => {
    /** @type {(errs: object) => void} */
    let resolveValidate = () => {}
    /** @type {any} */
    let validated
    const validate = vi.fn((v) => {
      validated = v
      return new Promise((r) => { resolveValidate = r })
    })
    const onSubmit = vi.fn()
    const { form, handleSubmit } = useForm(
      { address: { city: 'Cape Town', lines: ['1 Main Rd'] } },
      { validate, onSubmit }
    )

    const pending = handleSubmit(fakeSubmitEvent())
    form.values.address.city = 'Durban'
    form.values.address.lines.push('Unvalidated')
    resolveValidate({})
    await pending

    const expected = { address: { city: 'Cape Town', lines: ['1 Main Rd'] } }
    expect(validated).toEqual(expected)
    expect(onSubmit.mock.calls[0][0]).toEqual(expected)
    expect(onSubmit.mock.calls[0][0]).toBe(validated)
    // The edit is kept for the next submit.
    expect(form.values.address.city).toBe('Durban')
    const second = handleSubmit(fakeSubmitEvent())
    resolveValidate({})
    await second
    expect(onSubmit.mock.calls[1][0]).toEqual({ address: { city: 'Durban', lines: ['1 Main Rd', 'Unvalidated'] } })
  })

  it('hands out plain copies: changing them does not touch form.values', async () => {
    const onSubmit = vi.fn((v) => { v.tags.push('x'); v.profile.name = 'changed' })
    const { form, handleSubmit } = useForm({ tags: ['a'], profile: { name: 'Ada' }, count: 2n, note: null }, { onSubmit })
    await handleSubmit(fakeSubmitEvent())
    expect(form.values.tags).toEqual(['a'])
    expect(form.values.profile.name).toBe('Ada')
    expect(form.submitted).toBe(true)
  })

  it.each([
    ['a Date', () => new Date(0)],
    ['a Map', () => new Map()],
    ['a function', () => () => {}],
  ])('puts %s in form.message, releases submitting, and calls neither callback', async (_, make) => {
    const validate = vi.fn(() => ({}))
    const onSubmit = vi.fn()
    const { form, handleSubmit } = useForm({ nested: { value: make() } }, { validate, onSubmit })
    await handleSubmit(fakeSubmitEvent())
    expect(form.message).toMatch(/useForm: form values must be/)
    expect(form.submitting).toBe(false)
    expect(validate).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
