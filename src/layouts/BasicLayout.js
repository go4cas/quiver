import { html } from '@arrow-js/core'
import { ToastContainer } from '../components/ToastContainer.js'

/** @param {any} content */
export function BasicLayout(content) {
  return html`
    <div class="flex min-h-screen items-center justify-center bg-surface p-6">
      <main class="w-full max-w-sm rounded-panel border border-line bg-surface-raised p-8 shadow-panel theme-glass:backdrop-blur-md">
        ${content}
      </main>
    </div>
    ${ToastContainer()}
  `
}
