import { initRouter, createApp } from '@go4cas/quiver'
// The quiver() plugin in build.js scans src/pages/ and serves this manifest.
import routes, { notFound } from 'quiver:routes'
import { MainLayout } from './layout.js'

// No `base` option: initRouter() takes it from <base href> in index.html,
// which serve.js fills in from QUIVER_BASE.
await initRouter({ routes, notFound })
createApp({ target: '#app', layouts: { main: MainLayout }, defaultLayout: 'main' })
