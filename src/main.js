import './style.css'
import { provide, createApp } from './framework/index.js'
import { initRouter } from './framework/router.js'
import aliceAvatar from './assets/avatar-alice.svg'

provide('app', { name: 'Quiver', tagline: 'The Demo Hub' })
provide('currentUser', { name: 'Alice Nkosi', email: 'alice@example.com', avatar: aliceAvatar })

await initRouter()
await createApp({ root: '#app' })
