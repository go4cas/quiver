# @go4cas/quiver/client

A types-only entry: it declares the virtual modules `quiver:routes` and `quiver:app` (3.2) that the [Vite](./vite) and [Bun](./bun) plugins serve, so `checkJs` and TypeScript accept the import.

```json
// jsconfig.json (or tsconfig.json)
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": ["vite/client", "@go4cas/quiver/client"]
  }
}
```

Which entry points have types depends on `moduleResolution`. `"bundler"` and `"node16"`/`"nodenext"` read the packages' `exports` maps; the old `"node"` (node10) ignores `exports` and only finds a top-level `types` field:

| Entry point | `bundler`, `node16`, `nodenext` | `node` (node10) |
|---|---|---|
| `@go4cas/quiver` | types | types (top-level `types`, since 3.0.1) |
| `@go4cas/quiver/vite`, `/bun`, `/client` | types | no types: subpaths exist only in `exports` |
| `arrow-use` | types | no types: `arrow-use` 0.1.2 has no top-level `types` |

So use `"bundler"` (or `"node16"`/`"nodenext"`), as above. Quiver's CI installs the packed packages into fresh projects and type-checks each column with `skipLibCheck: false` on TypeScript 5.9 and 7 (node10 on 5.9 only, since TypeScript 7 removed it), with the Vite plugin inside Vite's `defineConfig()` and the Bun plugin inside a `Bun.build()` call typed by `@types/bun`.

It declares:

```ts
declare module 'quiver:routes' {
  const routes: import('@go4cas/quiver').RouteManifest
  export default routes
  export const notFound: import('@go4cas/quiver').RouteLoader | undefined
}

declare module 'quiver:app' {
  const app: import('@go4cas/quiver').AppManifest
  export default app
}
```

With the [`quiver routes` and `quiver app` CLI](./cli) you import a real file (`./routes.gen.js`, `./app.gen.js`) instead, and need no client types.
