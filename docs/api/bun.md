# @go4cas/quiver/bun

```js
import quiver from '@go4cas/quiver/bun'
```

A `Bun.build` plugin that serves the virtual modules `quiver:app` (since 3.2, the [app manifest](./vite#quiver-app) for a source folder) and `quiver:routes` (the route manifest for a pages folder).

## quiver

```ts
quiver(options?: { dir?: string, srcDir?: string }): BunPluginLike
```

| Option | Type | Default | |
|---|---|---|---|
| `srcDir` | `string` | `'src'` | source folder for `quiver:app`, relative to `process.cwd()` (3.2) |
| `dir` | `string` | `'<srcDir>/pages'` | pages folder, relative to `process.cwd()` |

```js
// build.js: run with `bun build.js`
import quiver from '@go4cas/quiver/bun'

const result = await Bun.build({
  entrypoints: ['src/main.js'],
  outdir: 'dist',
  splitting: true,
  plugins: [quiver()],
})
if (!result.success) process.exit(1)
```

```js
// src/main.js
import { initRouter } from '@go4cas/quiver'
import routes, { notFound } from 'quiver:routes'

await initRouter({ routes, notFound })   // base from <base href>
```

That is the [manual setup](/guide/manual-setup) [`examples/bun`](/examples#bun) uses. With the folder conventions, `import app from 'quiver:app'` and `await createApp(app, { target: '#app' })` work the same way under Bun.

- Generates the same module as the [Vite plugin](./vite): pages as dynamic imports, `notFound` or `undefined`.
- With `splitting: true`, each page becomes its own chunk, loaded on first visit. Chunk imports are relative, so one build serves at any base path when `index.html` has the right `<base href>`.
- It also serves [`quiver:app`](./vite#quiver-app) (3.2), the app manifest for `srcDir`, with the same rules; its warnings go to `console.warn`.
- A scan error fails the build with the `[quiver] ` messages.
- Runs on Bun 1.4.4+. Bun's dev server and `bunfig.toml` plugins are not covered; build, then serve `dist/` with a fallback to `index.html`.
- The return type is structural, so the package needs no `bun-types`.

Full app: [`examples/bun`](/examples#bun).
