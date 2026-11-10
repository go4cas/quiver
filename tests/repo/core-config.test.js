// SPEC P2 Done-when / D33 / TECH-SPEC W-5, X-12: core typechecks without
// vite/client (or any ambient) types, so import.meta.glob/.hot/.env fail its
// typecheck (src/node/ and bin/ get Node types from jsconfig.node.json), and its version is exactly 3.0.0 so the starter's ^3.0.0 links to it.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CORE = join(import.meta.dirname, '..', '..', 'packages/quiver')
/** @param {string} file */
const json = (file) => JSON.parse(readFileSync(join(CORE, file), 'utf8'))

describe('core package config', () => {
  it('typechecks src/ with no ambient types', () => {
    const config = json('jsconfig.json')
    expect(config.compilerOptions.types).toEqual([])
    expect(config.include).toEqual(['src'])
    expect(config.exclude).toEqual(['src/node'])
  })

  it('typechecks src/node/ and bin/ separately, with only Node types (W-5, T12)', () => {
    const config = json('jsconfig.node.json')
    expect(config.compilerOptions.types).toEqual(['node'])
    expect(config.include).toEqual(['src/node', 'bin'])
    expect(json('package.json').scripts.typecheck).toBe('tsc -p jsconfig.json && tsc -p jsconfig.node.json')
  })

  it('is version 3.0.0, not a prerelease', () => {
    expect(json('package.json').version).toBe('3.0.0')
  })

  it('has @arrow-js/core as its only peer and no dependencies', () => {
    const pkg = json('package.json')
    expect(pkg.peerDependencies).toEqual({ '@arrow-js/core': '^1.0.6' })
    expect(pkg.dependencies).toBeUndefined()
  })
})
