import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// uiState calls window.matchMedia at module scope; mock it before it loads.
vi.mock('../../src/state/uiState.js', () => ({ uiState: { theme: 'default', mode: 'light' } }))

import { toastState } from '../../src/state/toastState.js'
import { useToast }   from '../../src/composables/useToast.js'

beforeEach(() => {
  vi.useFakeTimers()
  toastState.toasts     = []
  toastState.dismissing = []
  toastState.config     = { position: 'bottom-right', duration: 4000, dismissible: true }
})

afterEach(() => {
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

  it('auto-dismisses after duration + exit animation', () => {
    toastState.add('Bye', { type: 'info', duration: 1000 })
    expect(toastState.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1200) // 1000ms duration + 200ms exit
    expect(toastState.toasts).toHaveLength(0)
  })

  it('does not auto-dismiss when duration is 0', () => {
    toastState.add('Sticky', { type: 'info', duration: 0 })
    vi.advanceTimersByTime(10000)
    expect(toastState.toasts).toHaveLength(1)
  })

  it('per-call opts override config defaults', () => {
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

  it('removes only the targeted toast after the exit animation', () => {
    const id1 = toastState.add('First',  { duration: 0 })
    const id2 = toastState.add('Second', { duration: 0 })
    toastState.dismiss(id1)
    vi.advanceTimersByTime(200)
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

  it('cancels the auto-dismiss timer on manual dismiss (no ghost re-dismiss)', () => {
    const id = toastState.add('Test', { duration: 1000 })
    toastState.dismiss(id)
    vi.advanceTimersByTime(200) // exit animation completes, toast removed
    expect(toastState.toasts).toHaveLength(0)

    vi.advanceTimersByTime(2000) // past the original auto-dismiss time
    expect(toastState.dismissing).toHaveLength(0) // stale timer never fired
  })
})

describe('toastState.configure()', () => {
  it('merges opts into config without touching unmentioned keys', () => {
    toastState.configure({ position: 'top-left' })
    expect(toastState.config.position).toBe('top-left')
    expect(toastState.config.duration).toBe(4000)
    expect(toastState.config.dismissible).toBe(true)
  })

  it('new toasts inherit the updated config defaults', () => {
    toastState.configure({ duration: 0, dismissible: false })
    toastState.add('After configure')
    const t = toastState.toasts[0]
    expect(t.duration).toBe(0)
    expect(t.dismissible).toBe(false)
  })
})

describe('useToast() shortcut methods', () => {
  it.each(['success', 'error', 'warning', 'info'])('%s() adds a toast with the correct type', (type) => {
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
