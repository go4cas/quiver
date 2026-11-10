import { describe, it, expect, vi } from 'vitest'
import { useForm } from '../../src/composables/useForm.js'

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
