// SPEC P8 Done-when (D36): the docs cover the whole public surface, and no 2.x
// leftovers remain outside the migration guide and the changelog.
//
// 1. Each public entry point is imported, and every export is on its API page,
//    plus `quiver routes` and each of its flags.
// 2. Every recipe and every arrow-use export has its own page, and every folder
//    in examples/ is linked from the examples page.
// 3. A grep for 2.x-only strings (the list is NOTES N115) finds nothing in docs/
//    or README.md, except in the migration guide.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const DOCS = join(ROOT, 'docs')
/** @param {string} path repo-relative */
const read = (path) => readFileSync(join(ROOT, path), 'utf8')
const CONFIG = read('docs/.vitepress/config.js')

/** @param {string} text @param {string} name @returns {boolean} a `## name` or `### name` heading */
const hasHeading = (text, name) => new RegExp(`^#{2,3} ${name.replace(/[$]/g, '\\$')}$`, 'm').test(text)

describe('API reference covers every public export (D36)', () => {
  it('@go4cas/quiver: each export has its own heading on api/core.md', async () => {
    const page = read('docs/api/core.md')
    const names = Object.keys(await import('@go4cas/quiver'))
    expect(names).toHaveLength(13)
    expect(names.filter((name) => !hasHeading(page, name))).toEqual([])
  })

  it('@go4cas/quiver: each exported type is in the Types table of api/core.md', () => {
    const page = read('docs/api/core.md')
    const types = [...read('packages/quiver/src/index.js').matchAll(/@typedef \{import\('\.\/types\.js'\)\.(\w+)\}/g)].map((m) => m[1])
    expect(types.length).toBeGreaterThan(0)
    expect(types.filter((type) => !page.includes(`\`${type}\``))).toEqual([])
  })

  it.each([
    ['@go4cas/quiver/vite', 'docs/api/vite.md'],
    ['@go4cas/quiver/bun', 'docs/api/bun.md'],
  ])('%s: its default export is documented as quiver() on %s', async (entry, file) => {
    const mod = await import(entry)
    expect(Object.keys(mod)).toEqual(['default'])
    expect(typeof mod.default).toBe('function')
    const page = read(file)
    expect(page).toContain(`import quiver from '${entry}'`)
    expect(hasHeading(page, 'quiver')).toBe(true)
  })

  it('@go4cas/quiver/client: the types-only entry has a page', () => {
    const pkg = JSON.parse(read('packages/quiver/package.json'))
    expect(Object.keys(pkg.exports).filter((k) => k !== './package.json')).toEqual(['.', './vite', './bun', './client'])
    expect(read('docs/api/client.md')).toContain('"@go4cas/quiver/client"')
  })

  it('arrow-use: each export has its own heading on api/arrow-use.md, and its types are listed', async () => {
    const page = read('docs/api/arrow-use.md')
    const names = Object.keys(await import('arrow-use'))
    expect(names.length).toBeGreaterThan(0)
    expect(names.filter((name) => !hasHeading(page, name))).toEqual([])
    const types = [...read('packages/arrow-use/src/index.js').matchAll(/@typedef \{import\('\.\/use\w+\.js'\)\.(\w+)(?:<T>)?\} (\w+)/g)].map((m) => m[2])
    expect(types.length).toBeGreaterThan(0)
    expect(types.filter((type) => !page.includes(type))).toEqual([])
  })

  it('the CLI page has `quiver routes` and every flag in the CLI usage', () => {
    const page = read('docs/api/cli.md')
    const usage = read('packages/quiver/bin/quiver.js').match(/const USAGE = `([\s\S]*?)`/)?.[1] ?? ''
    const flags = [...new Set([...usage.matchAll(/--[a-z]+/g)].map((m) => m[0]))]
    expect(flags).toEqual(expect.arrayContaining(['--dir', '--out', '--watch', '--help']))
    expect(page).toContain('quiver routes')
    expect(flags.filter((flag) => !page.includes(`| \`${flag}\``))).toEqual([])
  })

  it('every API page is in the sidebar', () => {
    for (const page of ['core', 'vite', 'bun', 'client', 'cli', 'arrow-use']) {
      expect(CONFIG, page).toContain(`link: '/api/${page}'`)
    }
  })

  it('the routing guide has the #browser-support anchor the initRouter() error links to (C-10)', () => {
    const message = read('packages/quiver/src/router.js').match(/https:\/\/go4cas\.github\.io\/quiver\/guide\/routing#([\w-]+)/)
    expect(message?.[1]).toBe('browser-support')
    expect(read('docs/guide/routing.md')).toMatch(/^## Browser support$/m)
  })
})

describe('every recipe, composable and example has a page (D36)', () => {
  /** @type {Record<string, { files: string[] }>} */
  const index = JSON.parse(read('recipes/index.json'))
  const folders = readdirSync(join(ROOT, 'recipes'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'recipes', d.name, 'README.md')))
    .map((d) => d.name)

  it('the registry and the recipe folders agree', () => {
    expect(Object.keys(index).sort()).toEqual(folders.sort())
  })

  it.each(Object.keys(index))('recipe %s: docs/recipes/<name>.md names its files and is in the sidebar and overview', (name) => {
    const file = `docs/recipes/${name}.md`
    expect(existsSync(join(ROOT, file)), file).toBe(true)
    const page = read(file)
    for (const f of index[name].files) expect(page, `${file}: ${f}`).toContain(f)
    expect(page, `${file}: install destination`).toContain(`src/quiver/${name}/`)
    expect(CONFIG).toContain(`link: '/recipes/${name}'`)
    expect(read('docs/recipes/index.md')).toContain(`(./${name})`)
  })

  it('every arrow-use export has docs/arrow-use/<name>.md, in the sidebar and the overview', async () => {
    const names = Object.keys(await import('arrow-use'))
    for (const name of names) {
      const file = `docs/arrow-use/${name}.md`
      expect(existsSync(join(ROOT, file)), file).toBe(true)
      expect(read(file)).toMatch(new RegExp(`^# ${name}$`, 'm'))
      expect(CONFIG).toContain(`link: '/arrow-use/${name}'`)
      expect(read('docs/arrow-use/index.md')).toContain(`(./${name})`)
    }
  })

  it('every folder in examples/, the arrow-use example and the starter are linked from docs/examples.md', () => {
    const page = read('docs/examples.md')
    const examples = readdirSync(join(ROOT, 'examples'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `examples/${d.name}`)
    expect(examples.length).toBeGreaterThan(0)
    for (const path of [...examples, 'packages/arrow-use/example', 'starter']) {
      expect(page, path).toContain(`(https://github.com/go4cas/quiver/tree/main/${path})`)
    }
  })
})

describe('no 2.x leftovers in the docs (D36, NOTES N115)', () => {
  // 2.x-only strings: paths and names that no longer exist in 3.0. Allowed only
  // in the migration guide (and CHANGELOG.md, which isn't scanned).
  const LEFTOVERS = [
    'src/framework/',
    'routerState',
    'Arrow.js · Vite starter template',
    'degit go4cas/quiver my-app',
    'starter template',
    'uiState',
    'src/styles/',
    'src/utils/',
    'src/composables/useForm',
    'src/composables/useToast',
    'src/composables/useFetch',
    'src/composables/useRoute',
    'src/composables/useRouter',
    'src/state/toastState',
    'src/components/Link.js',
    'src/components/ThemeSelector',
    'src/components/ThemeToggle',
    'src/components/ToastContainer',
    'LoadingCard',
    'ErrorCard',
    'destroyRouter',
    'import.meta.glob',
    'Navigation API is not supported in this browser',
    '.claude/commands/',
  ]
  const ALLOWED = new Set(['docs/guide/migration.md'])
  const SKIP = new Set(['node_modules', 'dist', 'cache', 'public'])

  /** @param {string} dir @returns {string[]} */
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (e.isDirectory()) return SKIP.has(e.name) ? [] : walk(join(dir, e.name))
      return /\.(md|js|vue|css)$/.test(e.name) ? [relative(ROOT, join(dir, e.name))] : []
    })

  const files = [...walk(DOCS), 'README.md']

  it('scans the guides, the config and the README', () => {
    expect(files).toEqual(expect.arrayContaining(['README.md', 'docs/index.md', 'docs/.vitepress/config.js', 'docs/guide/routing.md']))
  })

  it.each(LEFTOVERS)('%s appears only in the migration guide', (needle) => {
    expect(files.filter((f) => !ALLOWED.has(f) && read(f).includes(needle))).toEqual([])
  })

  it('the migration guide names the 2.x paths it maps', () => {
    const guide = read('docs/guide/migration.md')
    for (const needle of ['src/framework/', 'routerState', 'uiState', 'degit go4cas/quiver my-app']) expect(guide).toContain(needle)
  })
})

// S02 (2026-11-11 audit): without a local install, a bare `bunx quiver` or
// `npx quiver` fetches the unrelated npm package `quiver`. The no-install paths
// (the no-bundler quickstart, the no-build README's CDN section, the CLI page)
// must name the scoped package, and the quickstart must not use the bare form.
describe('the CLI is run by its scoped package where nothing is installed (S02)', () => {
  const BUNX = 'bunx --bun --package @go4cas/quiver@3 quiver routes'
  const NPM = 'npm exec --package=@go4cas/quiver@3 -- quiver routes'

  it.each(['docs/guide/getting-started.md', 'docs/api/cli.md', 'examples/no-build/README.md', 'packages/quiver/AGENTS.md'])(
    '%s gives both scoped commands',
    (path) => {
      const text = read(path)
      expect(text).toContain(BUNX)
      expect(text).toContain(NPM)
    },
  )

  it('the getting-started guide never uses a bare `bunx quiver` or `npx quiver`', () => {
    expect(read('docs/guide/getting-started.md')).not.toMatch(/\b(?:bunx|npx) quiver\b/)
  })

  it('the no-build README uses the bare form only for the copy with node_modules', () => {
    const readme = read('examples/no-build/README.md')
    const cdn = readme.slice(readme.indexOf('## From a CDN'))
    expect(cdn).not.toMatch(/\b(?:bunx|npx) quiver\b/)
  })
})
