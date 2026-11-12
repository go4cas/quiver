// Types for the virtual modules `quiver:routes` and `quiver:app`, served by @go4cas/quiver/vite and
// @go4cas/quiver/bun. Add it to your jsconfig/tsconfig, as with `vite/client`:
//
//   "compilerOptions": { "types": ["@go4cas/quiver/client"] }
declare module 'quiver:routes' {
  const routes: import('@go4cas/quiver').RouteManifest
  export default routes
  export const notFound: import('@go4cas/quiver').RouteLoader | undefined
}

declare module 'quiver:app' {
  const app: import('@go4cas/quiver').AppManifest
  export default app
}
