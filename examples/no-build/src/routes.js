// The route manifest, written by hand: no build step, so no plugin scans
// src/pages/. Each loader is a dynamic import, so a page loads on first visit.
// To generate this file from src/pages/ instead, run `quiver routes --watch`
// (it writes src/routes.gen.js).

/** @type {import('@go4cas/quiver').RouteManifest} */
const routes = {
  '/': () => import('./pages/index.js'),
  '/about': () => import('./pages/about.js'),
  '/users/:id': () => import('./pages/users/[id].js'),
}

export default routes

/** @type {import('@go4cas/quiver').RouteLoader} */
export const notFound = () => import('./pages/not-found.js')
