import { createApp } from '@go4cas/quiver'
// quiver() in vite.config.js scans src/ (pages/, layouts/) and serves this module.
import app from 'quiver:app'

// BASE_URL is Vite's `base`: '/' unless QUIVER_BASE is set (vite.config.js).
await createApp(app, { target: '#app', base: import.meta.env.BASE_URL })
