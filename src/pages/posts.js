import { html } from '@arrow-js/core'
import { useFetch } from '../composables/useFetch.js'

export const meta = {
  layout: 'menu',
  title: 'Posts',
}

const API    = 'https://jsonplaceholder.typicode.com/posts'
const BROKEN = 'https://jsonplaceholder.typicode.com/does-not-exist-404'

function PostsPage() {
  const posts  = useFetch(API, { transform: (data) => data.slice(0, 12), delay: 1500 })
  const broken = useFetch(BROKEN, { immediate: false })

  return html`
    <div class="space-y-10">
      <div>
        <h1 class="text-2xl font-bold text-fg">Posts</h1>
        <p class="mt-1 text-sm text-fg-soft">Data fetched from the JSONPlaceholder API using <code class="font-mono">useFetch</code>.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="rounded-full bg-brand-tint px-2.5 py-0.5 font-mono text-xs text-brand">useFetch()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">loading</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">error</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">refetch()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">transform</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover shadow-panel theme-brutalist:border-2 theme-brutalist:border-fg"
          @click="${() => { posts.refetch(); broken.reset() }}"
        >
          Refresh
        </button>
        <button
          type="button"
          class="rounded-control bg-surface-inset px-4 py-2 text-sm font-semibold text-fg-soft hover:bg-line"
          @click="${() => broken.refetch()}"
        >
          Force error
        </button>
        <span class="font-mono text-xs text-fg-faint">
          ${() => posts.loading()
            ? 'Loading…'
            : broken.error()
              ? `HTTP ${broken.status()}`
              : posts.status()
                ? `HTTP ${posts.status()}`
                : ''}
        </span>
      </div>

      ${() => posts.error() || broken.error()
        ? html`
            <div class="rounded-panel border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
              <p class="text-sm font-semibold text-red-700 dark:text-red-400">Error</p>
              <p class="mt-1 font-mono text-xs text-red-600 dark:text-red-500">${() => posts.error() || broken.error()}</p>
            </div>
          `
        : !posts.loading() && posts.data()
          ? html`
              <div class="rounded-panel border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
                <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Success — ${() => posts.data().length} posts loaded</p>
              </div>
            `
          : ''}

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        ${() => posts.loading()
          ? [...Array(6)].map((_, i) =>
              html`
                <div class="animate-pulse rounded-panel border border-line bg-surface-raised p-5">
                  <div class="h-4 w-3/4 rounded bg-surface-inset"></div>
                  <div class="mt-3 space-y-2">
                    <div class="h-3 rounded bg-surface-inset"></div>
                    <div class="h-3 w-5/6 rounded bg-surface-inset"></div>
                  </div>
                </div>
              `.key(`s${i}`)
            )
          : broken.error()
            ? []
            : (posts.data() ?? []).map((post) =>
              html`
                <article class="flex flex-col rounded-panel border border-line bg-surface-raised p-5 shadow-panel theme-glass:backdrop-blur-md theme-brutalist:border-2">
                  <div class="flex items-start justify-between gap-2">
                    <h2 class="text-sm font-semibold capitalize text-fg">${() => post.title}</h2>
                    <span class="shrink-0 rounded-full bg-surface-inset px-2 py-0.5 font-mono text-xs text-fg-faint">#${() => post.id}</span>
                  </div>
                  <p class="mt-2 flex-1 text-sm text-fg-soft">${() => post.body}</p>
                </article>
              `.key(post.id)
            )}
      </div>
    </div>
  `
}

export default PostsPage
