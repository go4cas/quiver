import { html } from '@arrow-js/core'

export function BasicLayout(content) {
  return html`
    <div class="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <main class="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        ${content}
      </main>
    </div>
  `
}
