import { initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from './routes.js'
import { MainLayout } from './layout.js'

// No `base` option: initRouter() takes it from <base href> in index.html.
await initRouter({ routes, notFound })
createApp({ target: '#app', layouts: { main: MainLayout }, defaultLayout: 'main' })
