import { html } from '@arrow-js/core'
import { userState } from '../../state/userState.js'
import { useRoute } from '../../composables/useRoute.js'
import { useRouter } from '../../composables/useRouter.js'
import { useMeta } from '../../framework/index.js'

export const meta = {
  layout: 'menu',
  title: 'Profile',
}

function UserDetailPage() {
  const route = useRoute()
  const router = useRouter()

  // Reactive document title — updates with the route param and user data.
  // The router clears this watcher automatically on the next navigation.
  useMeta({
    title: () => {
      const user = userState.users.find((u) => u.id === route.params().id)
      return user ? `${user.name} — Profile` : 'Profile'
    },
  })

  return html`
    <div class="page" data-spacing="tight">

      <button
        type="button"
        class="back-link"
        @click="${() => router.go('/users')}"
      >
        ← Back to team
      </button>

      <div>
        <h1 class="page__title">Profile</h1>
        <div class="chips">
          <span class="chip q-accent" data-tone="brand">/users/:id</span>
          <span class="chip">useRoute()</span>
          <span class="chip">useRouter()</span>
          <span class="chip">useMeta()</span>
        </div>
      </div>

      ${() => {
        const user = userState.users.find((u) => u.id === route.params().id)

        if (!user) {
          return html`
            <div class="alert q-panel" data-tone="warning" data-size="lg">
              <h2 class="profile__missing-title">User not found</h2>
              <p class="profile__missing-text">No user exists for ID <code>${() => route.params().id}</code>.</p>
            </div>
          `
        }

        return html`
          <div class="card profile q-panel" data-size="lg">
            <div class="profile__person">
              <img src="${user.avatar}" alt="" class="profile__avatar" />
              <div>
                <h2 class="profile__name">${() => user.name}</h2>
                <p class="profile__role">${() => user.role}</p>
              </div>
            </div>

            <dl class="profile__facts">
              <div class="fact">
                <dt class="fact__label">Team</dt>
                <dd class="fact__value">${() => user.team}</dd>
              </div>
              <div class="fact">
                <dt class="fact__label">Status</dt>
                <dd class="fact__value">${() => user.status}</dd>
              </div>
              <div class="fact">
                <dt class="fact__label">Route param · :id</dt>
                <dd class="fact__value q-accent" data-mono>${() => route.params().id}</dd>
              </div>
            </dl>
          </div>
        `
      }}

    </div>
  `
}

export default UserDetailPage
