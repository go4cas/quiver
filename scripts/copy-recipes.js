// The recipe copies (audit R15, N143, D44). Two paths share the registry:
// - copyRecipes() puts the recipes into the core tarball as they are in the
//   repository (packages/quiver/scripts/prepack.js), each with its README.md;
// - installRecipes() installs them into an app's source folder by role, the way
//   /add-* does: each path in a recipe's `files` (index.json) goes to the folder
//   it maps to (components/, composables/, styles/, layouts/, views/), and the
//   imports between recipes are rewritten to the new places (scripts/sync-recipes.js).
// Only the paths in `files` are copied, so a file left in a recipe folder without
// a registry entry reaches neither the starter nor the package.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'

/** @typedef {Record<string, { files: Record<string, string> }>} RecipeIndex */

/** @param {string} source @returns {RecipeIndex} */
export const readIndex = (source) => JSON.parse(readFileSync(join(source, 'index.json'), 'utf8'))

/**
 * Replace `dest` with the registry's recipes from `source`, in the repository's layout.
 * @param {string} source  a recipes/ folder with index.json
 * @param {string} dest    emptied first
 * @param {{ readmes?: boolean }} [options]  readmes: also copy each recipe's README.md
 * @returns {string[]} the recipe names copied
 */
export function copyRecipes(source, dest, { readmes = false } = {}) {
  const index = readIndex(source)
  rmSync(dest, { recursive: true, force: true })
  for (const [name, { files }] of Object.entries(index)) {
    const paths = readmes ? [...Object.keys(files), 'README.md'] : Object.keys(files)
    for (const file of paths) cpSync(join(source, name, file), join(dest, name, file), { recursive: true })
  }
  return Object.keys(index)
}

// `../<recipe>/<file>.js`, the only relative import a recipe may have (registry test).
const RECIPE_IMPORT = /((?:\bfrom\s*|\bimport\s*\(?\s*)(['"]))\.\.\/([^/'"]+)\/([^/'"]+\.js)\2/g

/**
 * Every file a recipe installs, folders expanded: [path in the recipe, path in the app's src/].
 * @param {string} source
 * @param {RecipeIndex} index
 * @param {string} name
 * @returns {[string, string][]}
 */
export function installedFiles(source, index, name) {
  return Object.entries(index[name].files).flatMap(([from, to]) => {
    if (!from.endsWith('/')) return [[from, to]]
    return readdirSync(join(source, name, from)).map((f) => /** @type {[string, string]} */ ([from + f, to + f]))
  })
}

/**
 * A recipe file's content as installed: for JS, each `../<recipe>/<file>.js`
 * import points at where that file is installed, relative to this one.
 * @param {string} source
 * @param {RecipeIndex} index
 * @param {string} name
 * @param {string} file a path in the recipe
 * @returns {Buffer}
 */
export function installedContent(source, index, name, file) {
  const raw = readFileSync(join(source, name, file))
  if (!file.endsWith('.js')) return raw
  const here = posix.dirname(index[name].files[file])
  const text = raw.toString('utf8').replace(RECIPE_IMPORT, (match, prefix, quote, recipe, target) => {
    const to = index[recipe]?.files[target]
    if (!to) throw new Error(`${name}/${file}: ${match} names no file in index.json`)
    const rel = posix.relative(here, to)
    return `${prefix}${rel.startsWith('.') ? rel : `./${rel}`}${quote}`
  })
  return Buffer.from(text, 'utf8')
}

/**
 * Install recipes into an app's source folder by role (D44).
 * @param {string} source  a recipes/ folder with index.json
 * @param {string} srcDir  the app's src/
 * @param {string[]} [names] default: every recipe
 * @returns {string[]} the app paths written, relative to srcDir
 */
export function installRecipes(source, srcDir, names) {
  const index = readIndex(source)
  /** @type {string[]} */
  const written = []
  for (const name of names ?? Object.keys(index)) {
    for (const [from, to] of installedFiles(source, index, name)) {
      mkdirSync(dirname(join(srcDir, to)), { recursive: true })
      writeFileSync(join(srcDir, to), installedContent(source, index, name, from))
      written.push(to)
    }
  }
  return written
}
