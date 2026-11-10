import { initRouter, createApp } from '@go4cas/quiver'
// quiver() in vite.config.js scans src/pages/ and serves this manifest.
import routes, { notFound } from 'quiver:routes'
import { MainLayout } from './layout.js'

// BASE_URL is Vite's `base`: '/' unless QUIVER_BASE is set (vite.config.js).
await initRouter({ routes, notFound, base: import.meta.env.BASE_URL })
createApp({ target: '#app', layouts: { main: MainLayout }, defaultLayout: 'main' })
