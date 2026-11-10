// Runs each example and the starter as a user would get them: copied out of the
// repo, with @go4cas/quiver and arrow-use installed from the tarballs `npm pack`
// makes, not from the workspace. Then typecheck (which reads the packed .d.ts)
// and the e2e suite run in each copy. SPEC P8, X-4; carry-over from the P5 review.
//
//   bun run pack:try                 # all of them
//   bun run pack:try examples/vite   # some of them
//
// Needs network access to the npm registry (for vite, typescript, Playwright)
// and Playwright's Chromium. @playwright/test is pinned to the repo's version so
// the installed browser matches.
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const APPS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['examples/vite', 'examples/bun', 'examples/no-build', 'starter']
const SKIP = new Set(['node_modules', 'dist', 'test-results', 'playwright-report'])

const require = createRequire(join(ROOT, 'package.json'))
const PLAYWRIGHT = require('@playwright/test/package.json').version

/** @param {string} cmd @param {string[]} args @param {string} cwd @returns {string} */
function run(cmd, args, cwd) {
  console.error(`$ ${cmd} ${args.join(' ')}   (${cwd})`)
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
}

const work = mkdtempSync(join(tmpdir(), 'quiver-packed-'))
console.error(`Working in ${work}`)

/** @type {Record<string, string>} package name → file: specifier of its tarball */
const tarballs = {}
for (const dir of ['packages/quiver', 'packages/arrow-use']) {
  const [{ name, filename }] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', work], join(ROOT, dir)))
  tarballs[name] = `file:${join(work, filename)}`
}

/** @type {string[]} */
const failed = []
for (const app of APPS) {
  const dest = join(work, app.replaceAll('/', '-'))
  cpSync(join(ROOT, app), dest, { recursive: true, filter: (src) => !SKIP.has(src.split(/[\\/]/).pop() ?? '') })

  const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
  for (const deps of [pkg.dependencies, pkg.devDependencies]) {
    for (const name of Object.keys(deps ?? {})) {
      if (tarballs[name]) deps[name] = tarballs[name]
      if (name === '@playwright/test') deps[name] = PLAYWRIGHT
    }
  }
  // arrow-use's tarball, also when it only comes in through a recipe or the starter.
  pkg.overrides = { ...tarballs }
  writeFileSync(join(dest, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)

  try {
    run('bun', ['install'], dest)
    const installed = JSON.parse(readFileSync(join(dest, 'node_modules/@go4cas/quiver/package.json'), 'utf8'))
    if (readdirSync(join(dest, 'node_modules/@go4cas/quiver')).includes('tests')) throw new Error('tests/ was installed')
    console.error(`${app}: @go4cas/quiver ${installed.version} from the tarball`)
    run('bun', ['run', 'typecheck'], dest)
    process.stdout.write(run('bun', ['run', 'test:e2e'], dest))
  } catch (error) {
    console.error(`${app}: FAILED (${/** @type {Error} */ (error).message.split('\n')[0]})`)
    failed.push(app)
  }
}

if (failed.length) {
  console.error(`\nFailed: ${failed.join(', ')}. Copies kept in ${work}`)
  process.exitCode = 1
} else {
  console.error(`\nAll passed: ${APPS.join(', ')}`)
  rmSync(work, { recursive: true, force: true })
}
