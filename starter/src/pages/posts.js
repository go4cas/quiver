import { html } from '@arrow-js/core'
import { useFetch } from 'arrow-use'

export const meta = {
  layout: 'menu',
  nav: { label: 'Posts', order: 3 },
  title: 'Posts',
}

const API    = 'https://jsonplaceholder.typicode.com/posts'
const BROKEN = 'https://jsonplaceholder.typicode.com/does-not-exist-404'

function PostsPage() {
  // Quiver runs the page inside a cleanup scope, so both requests are aborted
  // when you leave Posts and on destroy(), even inside the menu layout (N160).
  const posts  = useFetch(API, { transform: (data) => data.slice(0, 12) })
  const broken = useFetch(BROKEN, { immediate: false })

  return html`
    <div class="page">
      <div>
        <h1 class="page__title">Posts</h1>
        <p class="page__lead">Data fetched from the JSONPlaceholder API using <code>useFetch</code>.</p>
        <div class="chips">
          <span class="chip q-accent" data-tone="brand">useFetch()</span>
          <span class="chip">loading</span>
          <span class="chip">error</span>
          <span class="chip">refetch()</span>
          <span class="chip">transform</span>
        </div>
      </div>

      <div class="toolbar">
        <button
          type="button"
          class="btn" data-variant="primary"
          @click="${() => { broken.reset(); posts.refetch() }}"
        >
          Refresh
        </button>
        <button
          type="button"
          class="btn" data-variant="secondary"
          @click="${() => broken.refetch()}"
        >
          Force error
        </button>
        <span class="mono-note">
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
            <div class="alert q-panel" data-tone="error">
              <p class="alert__title">Error</p>
              <p class="alert__text">${() => posts.error() || broken.error()}</p>
            </div>
          `
        : !posts.loading() && posts.data()
          ? html`
              <div class="alert q-panel" data-tone="success">
                <p class="alert__title">Success — ${() => posts.data().length} posts loaded</p>
              </div>
            `
          : ''}

      ${() => posts.loading()
        ? html`
            <div class="grid" data-cols="2-3">
              ${() => [...Array(6)].map((_, i) =>
                html`
                  <div class="skeleton q-panel">
                    <div class="skeleton__line" data-width="title"></div>
                    <div class="skeleton__lines">
                      <div class="skeleton__line"></div>
                      <div class="skeleton__line" data-width="short"></div>
                    </div>
                  </div>
                `.key(`s${i}`)
              )}
            </div>
          `
        : ''}

      ${() => {
        const loading       = posts.loading()
        const postErr       = posts.error()
        const brokenPending = broken.loading() || broken.error()
        if (loading || postErr || brokenPending) return ''
        return html`
          <div class="grid" data-cols="2-3">
            ${() => (posts.data() ?? []).map(/** @param {{ id: number, title: string, body: string }} post */ (post) =>
              html`
                <article class="card post q-panel">
                  <div class="card__head">
                    <h2 class="post__title">${() => post.title}</h2>
                    <span class="badge">#${() => post.id}</span>
                  </div>
                  <p class="post__body">${() => post.body}</p>
                </article>
              `.key(post.id)
            )}
          </div>
        `
      }}
    </div>
  `
}

export default PostsPage
