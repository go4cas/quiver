// Type-checks the published .d.ts files the way a TypeScript user meets them:
// both tarballs from `npm pack` installed into a fresh project outside the repo,
// `skipLibCheck: false`, on TypeScript 5.x (whose DOM lib has no Navigation API
// result types, N124) and on the repo's TypeScript, under each module resolution.
// SPEC P8, X-4, X-11.
//
//   bun run pack:types
//
// The full cases use each plugin where a consumer does: the Vite plugin inside
// Vite's own defineConfig(), and the Bun plugin inside a Bun.build() call typed by
// @types/bun, so a plugin return type that stops being assignable fails here (R13).
//
// Needs network access to the npm registry (for typescript@5, vite, @types/bun and
// @arrow-js/core). They are installed into the temporary projects only, not into the repo.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const require = createRequire(join(ROOT, 'package.json'))
const TS_REPO = require('typescript/package.json').version
const TS_5 = '~5.9.3'
// The Vite the repo builds and tests with (docs/api/vite.md names it as the tested
// range), and the Bun types for the Bun the repo pins (engines.bun).
const VITE = require('vite/package.json').version
const BUN_TYPES = `^${JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).engines.bun.replace('>=', '')}`

/** @param {string} cmd @param {string[]} args @param {string} cwd @returns {string} */
function run(cmd, args, cwd) {
  console.error(`$ ${cmd} ${args.join(' ')}   (${cwd})`)
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
}

const work = mkdtempSync(join(tmpdir(), 'quiver-types-'))
console.error(`Working in ${work}`)

/** @type {Record<string, string>} package name → file: specifier of its tarball */
const tarballs = {}
for (const dir of ['packages/quiver', 'packages/arrow-use']) {
  const [{ name, filename }] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', work], join(ROOT, dir)))
  tarballs[name] = `file:${join(work, filename)}`
}
const arrow = JSON.parse(readFileSync(join(ROOT, 'packages/quiver/package.json'), 'utf8')).peerDependencies['@arrow-js/core']

// Every public entry point, with a use of each so the types are really read.
const ALL = `import { createApp, initRouter, url, useRoute, useRouter, beforeEach } from '@go4cas/quiver'
import type { RouteManifest, NavigationGuard, AppManifest, MiddlewareManifest, NavItem } from '@go4cas/quiver'
import quiver from '@go4cas/quiver/vite'
import quiverBun from '@go4cas/quiver/bun'
import routes, { notFound } from 'quiver:routes'
import app from 'quiver:app'
import { useFetch, useStorage, useMediaQuery, useEventListener } from 'arrow-use'
import { defineConfig } from 'vite'

const manifest: RouteManifest = routes
const guard: NavigationGuard = ({ to }) => (to === '/x' ? '/' : undefined)
const appManifest: AppManifest = app
const middleware: MiddlewareManifest = appManifest.middleware
const nav: NavItem[] = appManifest.nav
export const used = [createApp, initRouter, url('/'), useRoute, useRouter, beforeEach(guard), manifest, notFound,
  appManifest.routes, middleware.global, nav, useFetch, useStorage, useMediaQuery, useEventListener]

// The plugins where consumers put them, so their return types must be assignable.
export const viteConfig = defineConfig({ base: '/sub/app/', plugins: [quiver(), quiver({ dir: 'src/pages' }), quiver({ srcDir: 'src' })] })
export const bunBuild = () =>
  Bun.build({ entrypoints: ['src/main.js'], outdir: 'dist', splitting: true, plugins: [quiverBun({ dir: 'src/pages' }), quiverBun({ srcDir: 'src' })] })
`
// node10 ignores `exports`, so only the main entry resolves there (3.0.1, N124).
const MAIN = `import { url, useRouter } from '@go4cas/quiver'
export const used = [url('/'), useRouter]
`

/** @type {{ name: string, ts: string, compilerOptions: Record<string, unknown>, source: string }[]} */
const CASES = []
for (const [ts, version] of [['ts5', TS_5], ['ts-repo', TS_REPO]]) {
  CASES.push(
    { name: `${ts}-bundler`, ts: version, compilerOptions: { module: 'esnext', moduleResolution: 'bundler' }, source: ALL },
    { name: `${ts}-nodenext`, ts: version, compilerOptions: { module: 'nodenext', moduleResolution: 'nodenext' }, source: ALL },
  )
}
// TypeScript 7 removed node10, so only TypeScript 5 checks it.
CASES.push({ name: 'ts5-node10', ts: TS_5, compilerOptions: { module: 'commonjs', moduleResolution: 'node10' }, source: MAIN })

/** @type {string[]} */
const failed = []
for (const c of CASES) {
  const dest = join(work, c.name)
  mkdirSync(dest)
  const pkg = {
    name: `quiver-types-${c.name}`,
    private: true,
    type: c.compilerOptions.module === 'commonjs' ? 'commonjs' : 'module',
    devDependencies: {
      ...tarballs,
      '@arrow-js/core': arrow,
      typescript: c.ts,
      ...(c.source === ALL ? { vite: VITE, '@types/bun': BUN_TYPES } : {}),
    },
    overrides: { ...tarballs },
  }
  writeFileSync(join(dest, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
  const tsconfig = {
    compilerOptions: {
      strict: true,
      noEmit: true,
      target: 'es2022',
      lib: ['es2022', 'dom', 'dom.iterable'],
      types: c.source === ALL ? ['@go4cas/quiver/client', 'bun'] : [],
      skipLibCheck: false,
      ...c.compilerOptions,
    },
    files: ['index.ts'],
  }
  writeFileSync(join(dest, 'tsconfig.json'), `${JSON.stringify(tsconfig, null, 2)}\n`)
  writeFileSync(join(dest, 'index.ts'), c.source)
  try {
    run('bun', ['install'], dest)
    const tsc = join(dest, 'node_modules/typescript/package.json')
    const installed = JSON.parse(readFileSync(tsc, 'utf8')).version
    process.stdout.write(run('node', ['node_modules/typescript/bin/tsc', '-p', '.'], dest))
    console.error(`${c.name}: TypeScript ${installed}, skipLibCheck false: ok`)
  } catch (error) {
    const { message, stdout } = /** @type {Error & { stdout?: string }} */ (error)
    if (stdout) process.stderr.write(stdout)
    console.error(`${c.name}: FAILED (${message.split('\n')[0]})`)
    failed.push(c.name)
  }
}

if (failed.length) {
  console.error(`\nFailed: ${failed.join(', ')}. Projects kept in ${work}`)
  process.exitCode = 1
} else {
  console.error(`\nAll passed: ${CASES.map((c) => c.name).join(', ')}`)
  rmSync(work, { recursive: true, force: true })
}
