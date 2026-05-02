import { createStore } from '../framework/index.js'
import aliceAvatar from '../assets/avatar-alice.svg'
import bobAvatar from '../assets/avatar-bob.svg'
import charlieAvatar from '../assets/avatar-charlie.svg'
import placeholderAvatar from '../assets/avatar-placeholder.svg'

export const userState = createStore((reactive) =>
  reactive({
    users: [
      { id: crypto.randomUUID(), name: 'Alice Nkosi',   email: 'alice@example.com',   role: 'Support Agent',   team: 'Customer Care', status: 'online',  avatar: aliceAvatar },
      { id: crypto.randomUUID(), name: 'Bob Jacobs',    email: 'bob@example.com',     role: 'Support Manager', team: 'Operations',    status: 'away',    avatar: bobAvatar },
      { id: crypto.randomUUID(), name: 'Charlie Adams', email: 'charlie@example.com', role: 'Engineer',        team: 'Platform',      status: 'offline', avatar: charlieAvatar },
    ],

    addUser(user) {
      this.users.push({ status: 'online', avatar: placeholderAvatar, ...user, id: crypto.randomUUID() })
    },

    removeUser(id) {
      this.users = this.users.filter((u) => u.id !== id)
    },
  })
)
