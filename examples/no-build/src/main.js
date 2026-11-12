import { createApp } from '@go4cas/quiver'
// Written by `quiver app` from src/ (pages/, layouts/): no build step, so the
// module is a committed file. Regenerate it with `bunx quiver app --watch`.
import app from './app.gen.js'

// No `base` option: the router takes it from <base href> in index.html.
await createApp(app, { target: '#app' })
