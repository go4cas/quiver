// Types for the virtual module `quiver:routes`, served by @go4cas/quiver/vite and
// @go4cas/quiver/bun. Add it to your jsconfig/tsconfig, as with `vite/client`:
//
//   "compilerOptions": { "types": ["@go4cas/quiver/client"] }
declare module 'quiver:routes' {
  const routes: import('@go4cas/quiver').RouteManifest
  export default routes
  export const notFound: import('@go4cas/quiver').RouteLoader | undefined
}
