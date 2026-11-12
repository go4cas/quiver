import { createApp } from '@go4cas/quiver'
// The quiver() plugin in build.js scans src/ and serves this module.
import app from 'quiver:app'

// No `base` option: the router takes it from <base href> in index.html.
await createApp(app, { target: '#app' })
