# @go4cas/quiver/bun

```js
import quiver from '@go4cas/quiver/bun'
```

A `Bun.build` plugin that scans a pages folder and serves the route manifest as the virtual module `quiver:routes`.

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

- Generates the same module as the [Vite plugin](./vite): pages as dynamic imports, `notFound` or `undefined`.
- With `splitting: true`, each page becomes its own chunk, loaded on first visit. Chunk imports are relative, so one build serves at any base path when `index.html` has the right `<base href>`.
- It also serves [`quiver:app`](./vite#quiver-app) (3.2), the app manifest for `srcDir`, with the same rules; its warnings go to `console.warn`.
- A scan error fails the build with the `[quiver] ` messages.
- Runs on Bun 1.4.4+. Bun's dev server and `bunfig.toml` plugins are not covered; build, then serve `dist/` with a fallback to `index.html`.
- The return type is structural, so the package needs no `bun-types`.

Full app: [`examples/bun`](/examples#bun).
