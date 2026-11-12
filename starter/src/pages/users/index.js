import { html } from '@arrow-js/core'
import { UserCard } from '../../components/UserCard.js'
import { userState } from '../../state/userState.js'

export const meta = {
  layout: 'menu',
  nav: { label: 'Team', order: 2 },
  title: 'Team',
}

function UsersPage() {
  return html`
    <div class="page">

      <div class="team__header">
        <div>
          <h1 class="page__title">
            Team
            <span class="page__count">${() => userState.users.length}</span>
          </h1>
          <p class="page__lead">
            Add and remove members to see the reactive array update live.
          </p>
          <div class="chips">
            <span class="chip q-accent" data-tone="brand">file-based routing</span>
            <span class="chip q-accent" data-tone="brand">global store</span>
            <span class="chip">reactive arrays</span>
            <span class="chip">.key()</span>
          </div>
        </div>

        <button
          type="button"
          class="btn team__add" data-variant="primary"
          @click="${() => userState.addUser({ name: 'New Member', role: 'Analyst', team: 'Insights' })}"
        >
          Add member
        </button>
      </div>

      <section class="section">
        <div>
          <div class="section__head">
            <h2 class="section__title">Team member cards</h2>
            <span class="tag q-accent">nested components</span>
          </div>
          <p class="section__note">
            Each card is a <code>component()</code> instance rendered by this page.
            <code>.key(user.id)</code> gives each instance stable DOM identity so Arrow re-uses
            existing nodes instead of destroying and recreating them on every state change.
          </p>
        </div>
        <div class="grid" data-cols="md2-3">
          ${() => userState.users.map((user) => UserCard(user).key(user.id))}
        </div>
      </section>

    </div>
  `
}

export default UsersPage
