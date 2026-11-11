// TECH-SPEC W-11 / D19, D34: a degit copy of starter/ has no workspace, so its
// package.json must use real version ranges, never the workspace: protocol.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const pkg = JSON.parse(readFileSync(join(ROOT, 'starter/package.json'), 'utf8'))

describe('W-11: starter dependencies', () => {
  it('has no workspace: ranges', () => {
    const fields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
    const bad = fields.flatMap((field) =>
      Object.entries(pkg[field] ?? {}).filter(([, range]) => String(range).startsWith('workspace:')).map(([name]) => `${field}.${name}`),
    )
    expect(bad).toEqual([])
  })

  it('depends on the core package by its 3.x range, from 3.1 (page cleanup, N180)', () => {
    expect(pkg.dependencies['@go4cas/quiver']).toBe('^3.1.0')
  })
})
