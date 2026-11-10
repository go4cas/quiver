import { describe, it, expect, vi } from 'vitest'
import { useEventListener } from '../src/useEventListener.js'
import { mountInComponent } from './helpers/mount.js'

describe('useEventListener', () => {
  it('listens on a target', () => {
    const el = document.createElement('button')
    const handler = vi.fn()
    useEventListener(el, 'click', handler)
    el.click()
    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0]).toBeInstanceOf(MouseEvent)
  })

  it('reads a getter target once, at call time', () => {
    const el = new EventTarget()
    const getter = vi.fn(() => el)
    const handler = vi.fn()
    useEventListener(getter, 'ping', handler)
    el.dispatchEvent(new Event('ping'))
    expect(getter).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('adds nothing for a missing target or a getter that returns nothing or throws', () => {
    for (const target of [null, undefined, () => null, () => { throw new ReferenceError('window is not defined') }]) {
      const { stop } = useEventListener(target, 'click', () => {})
      expect(() => stop()).not.toThrow()
    }
  })

  it('passes options, and stop() removes a capture listener too', () => {
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.append(child)
    /** @type {string[]} */
    const order = []
    child.addEventListener('click', () => order.push('child'))
    const { stop } = useEventListener(parent, 'click', () => order.push('parent'), { capture: true })
    child.click()
    expect(order).toEqual(['parent', 'child'])
    stop()
    child.click()
    expect(order).toEqual(['parent', 'child', 'child'])
  })

  it('outside a component: stop() removes the listener and is idempotent', () => {
    const el = new EventTarget()
    const handler = vi.fn()
    const { stop } = useEventListener(el, 'ping', handler)
    stop()
    stop()
    el.dispatchEvent(new Event('ping'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('inside a component: unmounting removes the listener without calling stop()', async () => {
    const el = new EventTarget()
    const handler = vi.fn()
    const { unmount } = mountInComponent(() => useEventListener(el, 'ping', handler))
    el.dispatchEvent(new Event('ping'))
    expect(handler).toHaveBeenCalledOnce()
    await unmount()
    el.dispatchEvent(new Event('ping'))
    expect(handler).toHaveBeenCalledOnce()
  })
})
