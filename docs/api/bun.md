# @go4cas/quiver/bun

```js
import quiver from '@go4cas/quiver/bun'
```

A `Bun.build` plugin that scans a pages folder and serves the route manifest as the virtual module `quiver:routes`.

## quiver

```ts
quiver(options?: { dir?: string }): BunPluginLike
```

| Option | Type | Default | |
|---|---|---|---|
| `dir` | `string` | `'src/pages'` | pages folder, relative to `process.cwd()` |

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
- A scan error fails the build with the `[quiver] ` messages.
- Runs on Bun 1.4.4+. Bun's dev server and `bunfig.toml` plugins are not covered; build, then serve `dist/` with a fallback to `index.html`.
- The return type is structural, so the package needs no `bun-types`.

Full app: [`examples/bun`](/examples#bun).
