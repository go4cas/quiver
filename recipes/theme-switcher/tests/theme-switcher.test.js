import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { html, nextTick } from '@arrow-js/core'

/** @type {{ matches: boolean, listeners: Set<(e: { matches: boolean }) => void> }} */
let media

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.mode
  media = { matches: false, listeners: new Set() }
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return media.matches },
    addEventListener: (/** @type {string} */ _t, /** @type {any} */ fn) => media.listeners.add(fn),
    removeEventListener: (/** @type {string} */ _t, /** @type {any} */ fn) => media.listeners.delete(fn),
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

/** Imports a fresh copy of the recipe (its state is a module singleton). */
const load = () => import('../theme-switcher.js')
const root = () => document.documentElement

describe('themeState', () => {
  it('defaults to the default theme and the system mode, and writes nothing', async () => {
    media.matches = true
    const { themeState } = await load()
    expect(themeState.theme()).toBe('default')
    expect(themeState.mode()).toBe('dark')
    expect(root().dataset.theme).toBe('default')
    expect(root().dataset.mode).toBe('dark')
    expect(localStorage.getItem('ui-theme')).toBeNull()
    expect(localStorage.getItem('ui-mode')).toBeNull()
  })

  it('reads the stored values as plain strings (the 2.x keys)', async () => {
    localStorage.setItem('ui-theme', 'retro')
    localStorage.setItem('ui-mode', 'dark')
    const { themeState } = await load()
    expect(themeState.theme()).toBe('retro')
    expect(themeState.mode()).toBe('dark')
    expect(root().dataset.theme).toBe('retro')
  })

  it('follows a system mode change until the user picks a mode', async () => {
    const { themeState } = await load()
    expect(themeState.mode()).toBe('light')
    media.matches = true
    for (const fn of media.listeners) fn({ matches: true })
    await nextTick()
    expect(root().dataset.mode).toBe('dark')

    themeState.setMode('light')
    await nextTick()
    expect(root().dataset.mode).toBe('light')
    expect(localStorage.getItem('ui-mode')).toBe('light')
  })

  it('ignores an unknown stored mode', async () => {
    localStorage.setItem('ui-mode', 'sepia')
    const { themeState } = await load()
    expect(themeState.mode()).toBe('light')
  })

  it('setTheme() and toggleMode() persist and update <html>', async () => {
    const { themeState } = await load()
    themeState.setTheme('mono')
    themeState.toggleMode()
    await nextTick()
    expect(root().dataset.theme).toBe('mono')
    expect(root().dataset.mode).toBe('dark')
    expect(localStorage.getItem('ui-theme')).toBe('mono')
    expect(localStorage.getItem('ui-mode')).toBe('dark')
  })
})

describe('ThemeSelector and ThemeToggle', () => {
  it('share one state: a swatch click updates every selector, the toggle flips the mode', async () => {
    const { ThemeSelector, ThemeToggle, THEMES } = await load()
    const el = document.createElement('div')
    document.body.append(el)
    html`${ThemeSelector()}${ThemeSelector()}${ThemeToggle()}`(el)

    const groups = el.querySelectorAll('.q-theme-select')
    expect(groups).toHaveLength(2)
    expect(groups[0].querySelectorAll('button')).toHaveLength(THEMES.length)

    const glass = /** @type {HTMLButtonElement} */ (groups[0].querySelector('[aria-label="Liquid Glass"]'))
    glass.click()
    await nextTick()
    const pressed = [...el.querySelectorAll('[aria-pressed="true"]')].map((b) => b.getAttribute('aria-label'))
    expect(pressed).toEqual(['Liquid Glass', 'Liquid Glass'])
    expect(root().dataset.theme).toBe('glass')

    const toggle = /** @type {HTMLButtonElement} */ (el.querySelector('.q-mode-toggle'))
    toggle.click()
    await nextTick()
    expect(root().dataset.mode).toBe('dark')
  })

  it('puts each swatch colour in an inline custom property', async () => {
    const { ThemeSelector } = await load()
    const el = document.createElement('div')
    html`${ThemeSelector()}`(el)
    const mono = /** @type {HTMLElement} */ (el.querySelector('[aria-label="Monochrome"]'))
    expect(mono.getAttribute('style')).toBe('--swatch: #0a0a0a; --swatch-dark: #fafafa')
  })
})
