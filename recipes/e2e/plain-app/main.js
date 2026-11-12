import { html } from '@arrow-js/core'
import { ToastContainer, useToast } from './quiver/toasts/Toasts.js'

const toast = useToast()
const app = document.getElementById('app')

if (app) {
  html`
    <main>
      <h1>Plain Arrow app</h1>
      <button type="button" @click="${() => toast.success('Saved.')}">Save</button>
      <button type="button" @click="${() => toast.error('Failed.', { duration: 0 })}">Fail</button>
    </main>
    ${ToastContainer()}
  `(app)
}
