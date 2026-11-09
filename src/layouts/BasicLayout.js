import { html } from '@arrow-js/core'
import { ToastContainer } from '../components/ToastContainer.js'

// Styles: BasicLayout.css (classes q-basic, q-basic__card).
/** @param {any} content */
export function BasicLayout(content) {
  return html`
    <div class="q-basic">
      <main class="q-basic__card q-panel">
        ${content}
      </main>
    </div>
    ${ToastContainer()}
  `
}
