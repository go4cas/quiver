import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { html, nextTick } from '@arrow-js/core'
import { toastState, useToast, ToastContainer } from '../toasts.js'

// One container for the whole file: a container whose DOM is removed while
// toastState still changes would be patched without a parent.
const root = document.createElement('div')
beforeAll(() => {
  document.body.append(root)
  html`${ToastContainer()}`(root)
})

beforeEach(() => {
  // Arrow flushes renders with queueMicrotask, so leave it real.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  toastState.toasts     = []
  toastState.dismissing = []
})

afterEach(async () => {
  toastState.toasts     = []
  toastState.dismissing = []
  await nextTick()
  vi.useRealTimers()
})

describe('toastState.add()', () => {
  it('pushes a toast with correct fields and returns its id', () => {
    const id = toastState.add('Hello', { type: 'success' })
    expect(toastState.toasts).toHaveLength(1)
    const t = toastState.toasts[0]
    expect(t.id).toBe(id)
    expect(t.message).toBe('Hello')
    expect(t.type).toBe('success')
    expect(t.duration).toBe(4000)
    expect(t.dismissible).toBe(true)
  })

  it('defaults type to "info" when not provided', () => {
    toastState.add('Note')
    expect(toastState.toasts[0].type).toBe('info')
  })

  it('auto-dismisses after its duration', async () => {
    toastState.add('Bye', { type: 'info', duration: 1000 })
    await vi.advanceTimersByTimeAsync(999)
    expect(toastState.dismissing).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    await vi.runAllTimersAsync()
    expect(toastState.toasts).toHaveLength(0)
  })

  it('does not auto-dismiss when duration is 0', async () => {
    toastState.add('Sticky', { type: 'info', duration: 0 })
    await vi.advanceTimersByTimeAsync(10000)
    expect(toastState.toasts).toHaveLength(1)
  })

  it('per-call opts override defaults', () => {
    toastState.add('x', { duration: 0, dismissible: false })
    const t = toastState.toasts[0]
    expect(t.duration).toBe(0)
    expect(t.dismissible).toBe(false)
  })
})

describe('toastState.dismiss()', () => {
  it('marks the toast as dismissing immediately', () => {
    const id = toastState.add('Test', { duration: 0 })
    toastState.dismiss(id)
    expect(toastState.dismissing).toContain(id)
    expect(toastState.toasts).toHaveLength(1)
  })

  it('removes only the targeted toast, and resolves once it is gone', async () => {
    const id1 = toastState.add('First',  { duration: 0 })
    const id2 = toastState.add('Second', { duration: 0 })
    await toastState.dismiss(id1)
    expect(toastState.toasts).toHaveLength(1)
    expect(toastState.toasts[0].id).toBe(id2)
    expect(toastState.dismissing).not.toContain(id1)
  })

  it('is idempotent when called twice on the same id', () => {
    const id = toastState.add('Test', { duration: 0 })
    toastState.dismiss(id)
    toastState.dismiss(id)
    expect(toastState.dismissing.filter((d) => d === id)).toHaveLength(1)
  })

  it('ignores an unknown id', async () => {
    await toastState.dismiss('missing')
    expect(toastState.dismissing).toEqual([])
  })

  it('cancels the auto-dismiss timer on manual dismiss (no ghost re-dismiss)', async () => {
    const id = toastState.add('Test', { duration: 1000 })
    await toastState.dismiss(id)
    expect(toastState.toasts).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(2000) // past the original auto-dismiss time
    expect(toastState.dismissing).toHaveLength(0) // stale timer never fired
  })
})

describe('exit animation (D31)', () => {
  it('renders each toast with data-id, data-type and data-state="open"', async () => {
    const id = toastState.add('Saved', { type: 'success', duration: 0 })
    await nextTick()
    const el = /** @type {HTMLElement} */ (root.querySelector('.q-toast'))
    expect(el.dataset.id).toBe(id)
    expect(el.dataset.type).toBe('success')
    expect(el.dataset.state).toBe('open')
    expect(el.getAttribute('role')).toBe('alert')
    expect(root.querySelector('.q-toast__message')?.textContent).toBe('Saved')
  })

  it('sets data-state="closing" and waits for the element\'s animations to finish', async () => {
    const id = toastState.add('Saved', { duration: 0 })
    await nextTick()
    const el = /** @type {HTMLElement} */ (root.querySelector('.q-toast'))

    /** @type {() => void} */
    let finish = () => {}
    const finished = new Promise((resolve) => { finish = () => resolve(undefined) })
    Object.assign(el, { getAnimations: () => [{ finished }] })

    let removed = false
    const done = toastState.dismiss(id).then(() => { removed = true })
    await nextTick()
    expect(el.dataset.state).toBe('closing')

    await vi.advanceTimersByTimeAsync(5000) // no timer decides when it goes
    expect(removed).toBe(false)
    expect(toastState.toasts).toHaveLength(1)

    finish()
    await done
    expect(toastState.toasts).toHaveLength(0)
    await nextTick()
    expect(root.querySelector('.q-toast')).toBeNull()
  })

  it('removes the toast at once when nothing animates (reduced motion, no CSS)', async () => {
    const id = toastState.add('Saved', { duration: 0 })
    await nextTick()
    const el = /** @type {any} */ (root.querySelector('.q-toast'))
    el.getAnimations = () => []
    await toastState.dismiss(id)
    expect(toastState.toasts).toHaveLength(0)
  })

  it('still removes the toast when an animation is cancelled', async () => {
    const id = toastState.add('Saved', { duration: 0 })
    await nextTick()
    const el = /** @type {any} */ (root.querySelector('.q-toast'))
    el.getAnimations = () => [{ finished: Promise.reject(new DOMException('cancelled', 'AbortError')) }]
    await toastState.dismiss(id)
    expect(toastState.toasts).toHaveLength(0)
  })

  it('the dismiss button closes its toast; non-dismissible toasts have none', async () => {
    toastState.add('Sticky', { duration: 0, dismissible: false })
    toastState.add('Closable', { duration: 0 })
    await nextTick()
    const buttons = root.querySelectorAll('.q-toast__dismiss')
    expect(buttons).toHaveLength(1)
    const button = /** @type {HTMLElement} */ (buttons[0])
    button.click()
    await vi.runAllTimersAsync()
    expect(toastState.toasts.map((t) => t.message)).toEqual(['Sticky'])
  })
})

describe('a non-dismissible toast', () => {
  it('does not break rendering of later toasts (N99)', async () => {
    toastState.add('Sticky', { duration: 0, dismissible: false })
    await nextTick()
    toastState.toasts = []
    await nextTick()
    toastState.add('Next', { duration: 0 })
    await nextTick()
    expect(root.querySelector('.q-toast__message')?.textContent).toBe('Next')
    expect(root.querySelector('.q-toast__dismiss')).not.toBeNull()
  })
})

describe('useToast() shortcut methods', () => {
  it.each(/** @type {const} */ (['success', 'error', 'warning', 'info']))('%s() adds a toast with the correct type', (type) => {
    const toast = useToast()
    toast[type]('msg')
    expect(toastState.toasts[0].type).toBe(type)
  })

  it('dismiss() delegates to toastState.dismiss()', () => {
    const spy   = vi.spyOn(toastState, 'dismiss')
    const toast = useToast()
    toast.dismiss('some-id')
    expect(spy).toHaveBeenCalledWith('some-id')
  })
})
