import { component, html } from '@arrow-js/core'
import { go } from '../framework/router.js'
import { userState } from '../state/userState.js'

/** @typedef {import('../state/userState.js').User} User */

// Styles: UserCard.css, plus the shared card/mono-note classes in app.css.
export const UserCard = component(/** @param {User} user */ (user) => html`
  <article class="card user-card q-panel">
    <div class="user-card__head">
      <div class="user-card__person">
        <img src="${user.avatar}" alt="" class="user-card__avatar" />
        <div>
          <h3 class="user-card__name">${() => user.name}</h3>
          <p class="user-card__role">${() => user.role}</p>
        </div>
      </div>
      <span class="user-card__status" data-status="${() => user.status}">
        ${() => user.status}
      </span>
    </div>

    <p class="user-card__team">Team: <span>${() => user.team}</span></p>

    <p class="user-card__note mono-note">component() · stateless · reads global store</p>

    <div class="user-card__actions">
      <button
        type="button"
        class="user-card__action q-accent"
        data-action="view"
        @click="${() => go(`/users/${user.id}`)}"
      >
        View profile
      </button>
      <button
        type="button"
        class="user-card__action"
        data-action="remove"
        @click="${() => userState.removeUser(user.id)}"
      >
        Remove
      </button>
    </div>
  </article>
`)
