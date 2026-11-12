// S03 (2026-11-11 audit): the local demo servers (examples/bun, examples/no-build,
// tests/packed/bun-app, the arrow-use example and the recipes' plain app) listen on loopback only, answer
// a malformed path with 400, serve only the folders the page needs, and refuse an
// unsafe QUIVER_BASE. Spawns `bun`, so Bun must be on PATH (like routes-parity).
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, spawnSync } from 'node:child_process'
import { rmSync, symlinkSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

/**
 * Starts a server on a free port (PORT=0) and resolves its origin from the
 * "http://host:port" it logs.
 * @param {string} script repo-relative path @param {Record<string, string>} [env]
 */
function start(script, env = {}) {
  const child = spawn('bun', [join(ROOT, script)], {
    cwd: join(ROOT, script, '..'),
    env: { ...process.env, PORT: '0', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  /** @type {Promise<string>} */
  const origin = new Promise((resolve, reject) => {
    let out = ''
    child.stdout.on('data', (chunk) => {
      out += chunk
      const m = /http:\/\/([^/\s]+)/.exec(out)
      if (m) resolve(`http://${m[1]}`)
    })
    child.on('exit', (code) => reject(new Error(`${script} exited ${code}`)))
  })
  return { child, origin }
}

/** A non-loopback IPv4 address of this machine, if it has one. */
const external = Object.values(networkInterfaces())
  .flat()
  .find((i) => i && i.family === 'IPv4' && !i.internal)?.address

/** @param {string} url @returns {Promise<number>} */
const status = async (url) => (await fetch(url, { redirect: 'manual' })).status

const SERVERS = [
  {
    script: 'examples/bun/serve.js',
    base: '/sub/app/',
    ok: ['', 'users/1'],
    denied: ['serve.js', 'index.html.bak', 'package.json'],
  },
  {
    script: 'tests/packed/bun-app/serve.js',
    base: '/sub/app/',
    ok: ['', 'about'],
    denied: ['serve.js', 'package.json', 'src/main.js'],
  },
  {
    script: 'examples/no-build/serve.js',
    base: '/sub/app/',
    ok: ['', 'users/1', 'src/main.js', 'vendor/@go4cas/quiver/src/index.js', 'vendor/@arrow-js/core/dist/index.mjs'],
    denied: ['serve.js', 'package.json', 'vendor/@go4cas/quiver/package.json', 'vendor/@arrow-js/core/package.json', 'vendor/@go4cas/quiver/bin/quiver.js'],
  },
  {
    script: 'packages/arrow-use/example/serve.js',
    base: '/',
    ok: ['', 'data.json', 'src/main.js', 'vendor/arrow-use/src/index.js', 'vendor/@arrow-js/core/dist/index.mjs'],
    denied: ['serve.js', 'vendor/arrow-use/package.json', 'vendor/arrow-use/tests/conventions.test.js', 'vendor/@arrow-js/core/package.json'],
  },
  {
    script: 'recipes/e2e/serve.js',
    base: '/',
    ok: ['', 'main.js', 'quiver/toasts/Toasts.js', 'quiver/theme/tokens.css', 'vendor/@arrow-js/core/dist/index.mjs'],
    denied: ['serve.js', 'quiver/e2e/serve.js', 'quiver/tests/registry.test.js', 'quiver/toasts/tests/toasts.test.js', 'quiver/index.json'],
  },
]

describe.each(SERVERS)('$script (S03)', ({ script, base, ok, denied }) => {
  /** @type {ReturnType<typeof start>} */
  let server
  /** @type {string} */
  let origin
  beforeAll(async () => {
    server = start(script, base === '/' ? {} : { QUIVER_BASE: base })
    origin = await server.origin
  })
  afterAll(() => {
    server.child.kill()
  })

  it('listens on 127.0.0.1 only', async () => {
    expect(new URL(origin).hostname).toBe('127.0.0.1')
    if (external) await expect(fetch(`http://${external}:${new URL(origin).port}${base}`)).rejects.toThrow()
  })

  it('serves the app, its routes and the assets the page loads', async () => {
    for (const path of ok) expect([path, await status(`${origin}${base}${path}`)]).toEqual([path, 200])
  })

  it('serves nothing outside the folders the page needs', async () => {
    for (const path of denied) expect([path, await status(`${origin}${base}${path}`)]).toEqual([path, 404])
  })

  // (A literal or %2e%2e segment never reaches the server: URL parsing resolves it.)
  it('answers a malformed or climbing path with 400', async () => {
    for (const path of ['%E0%A4%A', 'src/..%2Fpackage.json', 'src/%00.js', 'src/..%5Cpackage.json']) {
      expect([path, await status(`${origin}${base}${path}`)]).toEqual([path, 400])
    }
  })
})

it('examples/no-build/serve.js does not follow a symlink out of src/ (S03)', async () => {
  const link = join(ROOT, 'examples/no-build/src/_s03-link.json')
  symlinkSync(join(ROOT, 'examples/no-build/package.json'), link)
  const server = start('examples/no-build/serve.js')
  try {
    expect(await status(`${await server.origin}/src/_s03-link.json`)).toBe(404)
    expect(await status(`${await server.origin}/src/main.js`)).toBe(200)
  } finally {
    server.child.kill()
    rmSync(link, { force: true })
  }
})

describe.each(['examples/bun/serve.js', 'tests/packed/bun-app/serve.js', 'examples/no-build/serve.js'])('%s base (S03)', (script) => {
  it.each(['sub', '/sub', '/"><script>alert(1)</script>/', '/../', '/.hidden/', 'http://evil/'])(
    'refuses QUIVER_BASE=%j',
    (base) => {
      const { status: code, stderr } = spawnSync('bun', [join(ROOT, script)], {
        cwd: join(ROOT, script, '..'),
        env: { ...process.env, PORT: '0', QUIVER_BASE: base },
        encoding: 'utf8',
        timeout: 10_000,
      })
      expect(code).toBe(1)
      expect(stderr).toContain('QUIVER_BASE must look like')
    },
  )
})
