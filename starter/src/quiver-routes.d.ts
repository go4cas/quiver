// Types for the virtual module that @go4cas/quiver/vite serves (see vite.config.js).
declare module 'quiver:routes' {
  const routes: import('@go4cas/quiver').RouteManifest
  export default routes
  export const notFound: import('@go4cas/quiver').RouteLoader | undefined
}
