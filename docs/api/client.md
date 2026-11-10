# @go4cas/quiver/client

A types-only entry: it declares the virtual module `quiver:routes` that the [Vite](./vite) and [Bun](./bun) plugins serve, so `checkJs` and TypeScript accept the import.

```json
// jsconfig.json (or tsconfig.json)
{
  "compilerOptions": {
    "types": ["vite/client", "@go4cas/quiver/client"]
  }
}
```

It declares:

```ts
declare module 'quiver:routes' {
  const routes: import('@go4cas/quiver').RouteManifest
  export default routes
  export const notFound: import('@go4cas/quiver').RouteLoader | undefined
}
```

With the [`quiver routes` CLI](./cli) you import a real file (`./routes.gen.js`) instead, and need no client types.
