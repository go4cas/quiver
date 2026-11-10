import { html } from '@arrow-js/core'
import { useForm } from '../composables/useForm.js'
import { useRouter } from '@go4cas/quiver'
import { userState } from '../state/userState.js'

export const meta = {
  layout: 'basic',
  title: 'Sign In',
}

function LoginPage() {
  const router = useRouter()

  const { form, handleSubmit, field } = useForm(
    { email: '', password: '' },
    {
      validate: (values) => {
        const errors = /** @type {Record<string, string>} */ ({})
        if (!values.email.trim()) {
          errors.email = 'Email is required.'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
          errors.email = 'Please enter a valid email address.'
        }
        if (!values.password.trim()) {
          errors.password = 'Password is required.'
        }
        return errors
      },

      onSubmit: async (values, f) => {
        const match = userState.users.find((u) => u.email?.toLowerCase() === values.email.trim().toLowerCase())

        if (!match) {
          f.errors = { email: 'No account found for this email.' }
          return
        }

        // Mock auth — password is validated for presence only, not checked against a credential.
        await new Promise((r) => setTimeout(r, 600))
        router.go('/')
      },
    },
  )

  const emailField = field('email')
  const passwordField = field('password')

  return html`
    <div>
      <div class="wordmark q-accent">Quiver</div>

      <div class="login__intro">
        <h1 class="page__title">Sign in</h1>
        <p class="page__lead">Centred via <code class="accent q-accent">BasicLayout</code>.</p>
        <div class="chips">
          <span class="chip q-accent" data-tone="brand">useForm()</span>
          <span class="chip">validate</span>
          <span class="chip">BasicLayout</span>
        </div>
      </div>

      <form class="form" novalidate @submit="${handleSubmit}">
        <label class="field">
          <span class="field__label">Email <span class="accent q-accent">*</span></span>
          <input class="field__input" type="email" placeholder="alice@example.com" @input="${/** @type {any} */ (emailField.set)}" />
          ${() => (emailField.error() ? html`<p class="field__error">${() => emailField.error()}</p>` : '')}
        </label>

        <label class="field">
          <span class="field__label">Password <span class="accent q-accent">*</span></span>
          <input class="field__input" type="password" placeholder="••••••••" @input="${/** @type {any} */ (passwordField.set)}" />
          ${() => (passwordField.error() ? html`<p class="field__error">${() => passwordField.error()}</p>` : '')}
        </label>

        <button
          type="submit"
          aria-disabled="${() => form.submitting ? 'true' : 'false'}"
          class="submit"
        >${() => (form.submitting ? 'Signing in…' : 'Sign in')}</button>
      </form>

      <p class="login__hint">Try: alice@example.com · bob@example.com · charlie@example.com</p>
    </div>
  `
}

export default LoginPage
