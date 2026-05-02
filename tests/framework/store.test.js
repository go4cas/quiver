import { describe, it, expect } from 'vitest'
import { createStore } from '../../src/framework/store.js'

describe('createStore', () => {
  it('calls setup with a reactive factory and returns its result', () => {
    const store = createStore((reactive) => reactive({ count: 0 }))
    expect(store.count).toBe(0)
  })

  it('returned store reflects mutations', () => {
    const store = createStore((reactive) => reactive({ count: 0 }))
    store.count = 5
    expect(store.count).toBe(5)
  })

  it('supports methods on the store object', () => {
    const store = createStore((reactive) =>
      reactive({
        count: 0,
        increment() { this.count++ },
      })
    )
    store.increment()
    expect(store.count).toBe(1)
  })

  it('method defined as a regular function can access reactive state via this', () => {
    const store = createStore((reactive) =>
      reactive({
        value: 10,
        double() { return this.value * 2 },
      })
    )
    expect(store.double()).toBe(20)
  })
})
