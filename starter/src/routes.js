// File-based routes for the starter: every file under pages/ is a route.
// P4 replaces this file with the `quiver:routes` Vite plugin from @go4cas/quiver/vite.
//
//   pages/index.js       → /
//   pages/users/[id].js  → /users/:id
//   pages/not-found.js   → the notFound page (not a route)

/** @typedef {() => Promise<any>} RouteLoader */

const pages = import.meta.glob('./pages/**/*.js')

/**
 * @param {string} file  a key of the glob above, e.g. './pages/users/[id].js'
 * @returns {string}     the route pattern, e.g. '/users/:id'
 */
export function fileToRoutePath(file) {
  let path = file
    .replace('./pages', '')
    .replace(/\.js$/, '')
    .replace(/\/index$/, '')

  if (!path) path = '/'

  return path.replace(/\[([^\]]+)\]/g, ':$1')
}

/** @type {Record<string, RouteLoader>} */
export const routes = {}

for (const [file, loader] of Object.entries(pages)) {
  // not-found.js files are never routes; only the top-level one is used.
  if (file.endsWith('/not-found.js')) continue
  routes[fileToRoutePath(file)] = loader
}

/** @type {RouteLoader | undefined} */
export const notFound = pages['./pages/not-found.js']
