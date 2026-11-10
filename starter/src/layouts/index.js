import { layouts as recipeLayouts } from '../quiver/layouts/layouts.js'

// The layouts pages can name in `meta.layout`. 'basic' and 'menu' come from the
// layouts recipe (src/quiver/layouts/); add the app's own layouts here.
/** @type {Record<string, import('@go4cas/quiver').Layout>} */
export const layouts = {
  ...recipeLayouts,
}
