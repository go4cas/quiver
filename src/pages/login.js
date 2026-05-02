import { html } from '@arrow-js/core'
import { useForm } from '../composables/useForm.js'
import { useRouter } from '../composables/useRouter.js'
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
        const errors = {}
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
        const match = userState.users.find((u) => u.email.toLowerCase() === values.email.trim().toLowerCase())

        if (!match) {
          f.errors = { email: 'No account found for this email.' }
          return
        }

        // Mock auth — password is validated for presence only, not checked against a credential.
        // Replace this block with a real API call in a production app.
        await new Promise((r) => setTimeout(r, 600))
        router.go('/')
      },
    },
  )

  const emailField = field('email')
  const passwordField = field('password')

  return html`
    <div>
      <div class="font-audiowide text-4xl text-brand">Quiver</div>

      <div class="mt-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Sign in</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Centred via <code class="font-mono text-brand">BasicLayout</code>.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-xs text-brand">useForm()</span>
          <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">validate</span>
          <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">BasicLayout</span>
        </div>
      </div>

      <form class="mt-6 space-y-4" novalidate @submit="${handleSubmit}">
        <label class="block">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Email <span class="text-brand">*</span></span>
          <input class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 transition focus:border-brand focus:bg-white dark:focus:bg-slate-700" type="email" placeholder="alice@example.com" @input="${emailField.set}" />
          ${() => (emailField.error() ? html`<p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">${() => emailField.error()}</p>` : '')}
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Password <span class="text-brand">*</span></span>
          <input class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 transition focus:border-brand focus:bg-white dark:focus:bg-slate-700" type="password" placeholder="••••••••" @input="${passwordField.set}" />
          ${() => (passwordField.error() ? html`<p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">${() => passwordField.error()}</p>` : '')}
        </label>

        <button
          type="submit"
          aria-disabled="${() => form.submitting ? 'true' : 'false'}"
          class="${() => `w-full rounded-xl bg-brand px-4 py-2.5 font-semibold text-white transition ${form.submitting ? 'cursor-not-allowed opacity-50' : 'hover:bg-brand-hover'}`}"
        >${() => (form.submitting ? 'Signing in…' : 'Sign in')}</button>
      </form>

      <p class="mt-5 text-center font-mono text-xs text-slate-400 dark:text-slate-500">Try: alice@example.com · bob@example.com · charlie@example.com</p>
    </div>
  `
}

export default LoginPage
