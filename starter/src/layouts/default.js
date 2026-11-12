import { html } from '@arrow-js/core'
import { ToastContainer } from '../components/Toasts.js'

// Layouts recipe, the default layout: a centred card. In an app it is
// layouts/default.js, so pages without `meta.layout` get it. Styles:
// layouts.css (classes q-basic*). Mounts the toast container.

/** @param {any} content */
export default function BasicLayout(content) {
  return html`
    <div class="q-basic">
      <main class="q-basic__card q-panel">
        ${content}
      </main>
    </div>
    ${ToastContainer()}
  `
}
