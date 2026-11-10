import { html, reactive } from '@arrow-js/core'
import { useToast, toastState } from '../quiver/toasts/toasts.js'

export const meta = {
  layout: 'menu',
  title: 'Toasts',
}

function ToastsPage() {
  const toast = useToast()
  const form  = reactive({ duration: 4000, dismissible: true })

  const fire = /** @param {'success' | 'error' | 'warning' | 'info'} type */ (type) => {
    const messages = {
      success: 'Changes saved successfully.',
      error:   'Something went wrong. Please try again.',
      warning: 'Your session expires in 5 minutes.',
      info:    'A new version is available.',
    }
    toast[type](messages[type], {
      duration:    form.duration,
      dismissible: form.dismissible,
    })
  }

  return html`
    <div class="page">
      <div>
        <h1 class="page__title">Toasts</h1>
        <p class="page__lead">Global notifications via <code>useToast</code> and <code>toastState</code>.</p>
        <div class="chips">
          <span class="chip q-accent" data-tone="brand">useToast()</span>
          <span class="chip">add()</span>
          <span class="chip">dismiss()</span>
        </div>
      </div>

      <div class="toast-demo">
        <div class="card q-panel" data-size="lg">
          <h2 class="card__title">Trigger</h2>
          <div class="button-row">
            <button
              type="button"
              class="btn" data-tone="success"
              @click="${() => fire('success')}"
            >Success</button>
            <button
              type="button"
              class="btn" data-tone="error"
              @click="${() => fire('error')}"
            >Error</button>
            <button
              type="button"
              class="btn" data-tone="warning"
              @click="${() => fire('warning')}"
            >Warning</button>
            <button
              type="button"
              class="btn" data-tone="info"
              @click="${() => fire('info')}"
            >Info</button>
          </div>
          <p class="card__status mono-note">
            ${() => toastState.toasts.length
              ? `${toastState.toasts.length} active`
              : 'none active'}
          </p>
        </div>

        <div class="card q-panel" data-size="lg">
          <h2 class="card__title">Options</h2>
          <div class="options">
            <label class="option">
              <span class="option__label">Duration (ms · 0 = permanent)</span>
              <input
                type="number"
                min="0"
                step="500"
                class="option__input"
                value="${() => form.duration}"
                @input="${/** @param {any} e */ (e) => { form.duration = Number(e.target.value) }}"
              />
            </label>

            <label class="check">
              <input
                type="checkbox"
                class="check__box"
                checked
                @change="${/** @param {any} e */ (e) => { form.dismissible = e.target.checked }}"
              />
              <span class="check__label">Dismissible</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `
}

export default ToastsPage
