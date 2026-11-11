// The one recipe copy used by both copy paths (audit R15, N143): starter sync
// (scripts/sync-recipes.js) and the core tarball (packages/quiver/scripts/prepack.js).
// Only the paths in each recipe's `files` (index.json) are copied, so a file left
// in a recipe folder without a registry entry reaches neither the starter nor the
// package. The tarball also gets each recipe's README.md; the starter doesn't.
import { cpSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Replace `dest` with the registry's recipes from `source`.
 * @param {string} source  a recipes/ folder with index.json
 * @param {string} dest    emptied first
 * @param {{ readmes?: boolean }} [options]  readmes: also copy each recipe's README.md
 * @returns {string[]} the recipe names copied
 */
export function copyRecipes(source, dest, { readmes = false } = {}) {
  /** @type {Record<string, { files: string[] }>} */
  const index = JSON.parse(readFileSync(join(source, 'index.json'), 'utf8'))
  rmSync(dest, { recursive: true, force: true })
  for (const [name, { files }] of Object.entries(index)) {
    const paths = readmes ? [...files, 'README.md'] : files
    for (const file of paths) cpSync(join(source, name, file), join(dest, name, file), { recursive: true })
  }
  return Object.keys(index)
}
