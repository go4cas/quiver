import { createStore } from '../framework/index.js'
import aliceAvatar from '../assets/avatar-alice.svg'
import bobAvatar from '../assets/avatar-bob.svg'
import charlieAvatar from '../assets/avatar-charlie.svg'
import placeholderAvatar from '../assets/avatar-placeholder.svg'

/** @typedef {{ id: string, name: string, email?: string, role: string, team: string, status: string, avatar: string }} User */

export const userState = createStore((reactive) =>
  reactive({
    /** @type {User[]} */
    users: [
      { id: crypto.randomUUID(), name: 'Alice Nkosi',   email: 'alice@example.com',   role: 'Support Agent',   team: 'Customer Care', status: 'online',  avatar: aliceAvatar },
      { id: crypto.randomUUID(), name: 'Bob Jacobs',    email: 'bob@example.com',     role: 'Support Manager', team: 'Operations',    status: 'away',    avatar: bobAvatar },
      { id: crypto.randomUUID(), name: 'Charlie Adams', email: 'charlie@example.com', role: 'Engineer',        team: 'Platform',      status: 'offline', avatar: charlieAvatar },
    ],

    /** @param {{ name: string, role: string, team: string, email?: string, status?: string, avatar?: string }} user */
    addUser(user) {
      this.users.push({ status: 'online', avatar: placeholderAvatar, ...user, id: crypto.randomUUID() })
    },

    /** @param {string} id */
    removeUser(id) {
      this.users = this.users.filter((u) => u.id !== id)
    },
  })
)
