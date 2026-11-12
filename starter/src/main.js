import './style.css'
import { createApp } from '@go4cas/quiver'
// The whole app, generated from src/ by the quiver() plugin in vite.config.js:
// pages/ (routes), layouts/, views/, middleware/, app.config.js, and the sidebar
// links from each page's meta.nav.
import app from 'quiver:app'

// BASE_URL is Vite's `base` ('/' unless QUIVER_BASE is set, see vite.config.js).
await createApp(app, { target: '#app', base: import.meta.env.BASE_URL })
