// @vitest-environment node
// TECH-SPEC C-3 / R4: importing the entry and every browser module touches no
// window, document, navigation or localStorage at module evaluation.
import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const SRC = join(import.meta.dirname, '..', 'src')

describe('no browser globals at import (C-3)', () => {
  it('runs in an environment without window or document', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  const files = readdirSync(SRC).filter((f) => f.endsWith('.js'))

  it.each(files)('imports src/%s without throwing', async (file) => {
    await expect(import(pathToFileURL(join(SRC, file)).href)).resolves.toBeDefined()
  })

  it('initRouter() rejects with the Navigation API message instead of crashing', async () => {
    const { initRouter } = await import('../src/index.js')
    await expect(initRouter({ routes: {} })).rejects.toThrow(/Quiver needs the Navigation API/)
  })
})
