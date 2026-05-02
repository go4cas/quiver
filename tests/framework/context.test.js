import { describe, it, expect, beforeEach } from 'vitest'
import { provide, inject } from '../../src/framework/context.js'

// The _ctx Map is module-level and persists across tests in the same file.
// Use unique key prefixes per describe block and reset between tests via
// re-providing, or simply use keys that cannot collide with other tests.
// Alternatively, provide a fresh value in beforeEach to ensure a clean slate.

describe('provide / inject', () => {
  beforeEach(() => {
    // Reset known keys to a clean state before each test.
    provide('ctx:a', undefined)
    provide('ctx:b', undefined)
  })

  it('inject returns a provided value', () => {
    provide('ctx:a', { name: 'Arrow' })
    expect(inject('ctx:a')).toEqual({ name: 'Arrow' })
  })

  it('inject returns the fallback when key is not set', () => {
    expect(inject('ctx:missing', 'default')).toBe('default')
  })

  it('inject returns undefined when key is not set and no fallback given', () => {
    expect(inject('ctx:none')).toBeUndefined()
  })

  it('provide overwrites a previously provided value', () => {
    provide('ctx:b', 'first')
    provide('ctx:b', 'second')
    expect(inject('ctx:b')).toBe('second')
  })
})
