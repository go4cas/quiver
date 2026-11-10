import { describe, it, expect, vi } from 'vitest'
import { html } from '@arrow-js/core'
import { LoadingView, ErrorView } from '../views.js'

/** @param {import('@arrow-js/core').ArrowTemplate} template */
function render(template) {
  const el = document.createElement('div')
  html`${template}`(el)
  return el
}

describe('LoadingView', () => {
  it('renders a status card', () => {
    const el = render(LoadingView())
    expect(el.querySelector('.q-view__card')?.getAttribute('role')).toBe('status')
    expect(el.textContent).toContain('Loading…')
  })
})

describe('ErrorView', () => {
  it('shows the message, an alert role and the error tone', () => {
    const el = render(ErrorView({ message: 'HTTP 500' }))
    const card = el.querySelector('.q-view__card')
    expect(card?.getAttribute('role')).toBe('alert')
    expect(card?.getAttribute('data-tone')).toBe('error')
    expect(el.querySelector('.q-view__text')?.textContent).toBe('HTTP 500')
  })

  it('falls back to a generic message', () => {
    const el = render(ErrorView({ message: '' }))
    expect(el.querySelector('.q-view__text')?.textContent).toBe('The page could not be shown.')
  })

  it('calls retry() from the Try again button (N70)', () => {
    const retry = vi.fn()
    const el = render(ErrorView({ message: 'x', retry }))
    const button = /** @type {HTMLButtonElement} */ (el.querySelector('button.q-view__action'))
    expect(button.textContent).toBe('Try again')
    button.click()
    expect(retry).toHaveBeenCalledOnce()
  })

  it('has no Try again button without retry, and always a home link', () => {
    const el = render(ErrorView({ message: 'x' }))
    expect(el.querySelector('button')).toBeNull()
    const link = /** @type {HTMLAnchorElement} */ (el.querySelector('a.q-view__action'))
    expect(link.getAttribute('href')).toBe('/')
    expect(link.textContent).toBe('Go home')
  })
})
