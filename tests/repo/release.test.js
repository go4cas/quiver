// Audit S05 (planning/v3/NOTES.md N165): npm releases are staged from CI through trusted
// publishing with provenance. scripts/release-check.js decides what a ref may release;
// .github/workflows/publish.yml keeps the OIDC token away from repository code.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PACKAGES, distTag, resolveRelease } from '../../scripts/release-check.js'

const ROOT = join(import.meta.dirname, '..', '..')
const WORKFLOW = readFileSync(join(ROOT, '.github/workflows/publish.yml'), 'utf8')
const CHECKS = readFileSync(join(ROOT, '.github/workflows/checks.yml'), 'utf8')
const TESTS = readFileSync(join(ROOT, '.github/workflows/test.yml'), 'utf8')
/** @param {string} name */
const setting = (name) => JSON.parse(readFileSync(join(ROOT, '.github/settings', name), 'utf8'))

/** @param {Record<string, string>} versions */
const reader = (versions) => (/** @type {string} */ dir) => versions[dir]
const current = reader({ 'packages/quiver': '3.0.4', 'packages/arrow-use': '0.1.2' })

/**
 * The text of one job, from its `  name:` line to the next job or the end.
 * @param {string} name
 * @param {string} [text]
 */
function job(name, text = WORKFLOW) {
  const start = text.indexOf(`\n  ${name}:\n`)
  expect(start, name).toBeGreaterThan(-1)
  const rest = text.slice(start + 1)
  const next = rest.slice(1).search(/\n {2}[a-z-]+:\n/)
  return next === -1 ? rest : rest.slice(0, next + 1)
}

describe('release resolution (scripts/release-check.js)', () => {
  it('releases @go4cas/quiver from v<version> and arrow-use from arrow-use-v<version>', () => {
    expect(resolveRelease({ ref: 'refs/tags/v3.0.4', readVersion: current })).toEqual({
      key: 'quiver', dir: 'packages/quiver', name: '@go4cas/quiver', version: '3.0.4', distTag: 'latest', publish: true,
    })
    expect(resolveRelease({ ref: 'refs/tags/arrow-use-v0.1.2', readVersion: current })).toEqual({
      key: 'arrow-use', dir: 'packages/arrow-use', name: 'arrow-use', version: '0.1.2', distTag: 'latest', publish: true,
    })
  })

  it('refuses a tag whose version is not the package.json version', () => {
    expect(() => resolveRelease({ ref: 'refs/tags/v3.0.5', readVersion: current })).toThrow(/3\.0\.5.*3\.0\.4/)
    expect(() => resolveRelease({ ref: 'refs/tags/arrow-use-v0.1.1', readVersion: current })).toThrow(/package\.json is 0\.1\.2/)
  })

  it('refuses tags that are not release tags', () => {
    for (const tag of ['3.0.4', 'release-3.0.4', 'v3.0', 'v3.0.4x', 'arrow-use-0.1.2', 'quiver-v3.0.4']) {
      expect(() => resolveRelease({ ref: `refs/tags/${tag}`, readVersion: current }), tag).toThrow()
    }
  })

  it('refuses a manual run whose package disagrees with the tag, or names no package', () => {
    expect(() => resolveRelease({ ref: 'refs/tags/v3.0.4', input: 'arrow-use', readVersion: current })).toThrow(/releases quiver/)
    expect(() => resolveRelease({ ref: 'refs/heads/main', input: 'other', readVersion: current })).toThrow(/Unknown package/)
  })

  it('never publishes from a branch or a dry run', () => {
    expect(resolveRelease({ ref: 'refs/heads/main', input: 'arrow-use', readVersion: current })).toMatchObject({
      name: 'arrow-use', version: '0.1.2', publish: false,
    })
    expect(resolveRelease({ ref: 'refs/heads/feature', readVersion: current })).toMatchObject({ key: 'quiver', publish: false })
    expect(resolveRelease({ ref: 'refs/tags/v3.0.4', input: 'quiver', dryRun: true, readVersion: current }).publish).toBe(false)
  })

  it('puts prereleases on the next dist-tag', () => {
    expect(distTag('3.1.0-beta.1')).toBe('next')
    expect(distTag('3.1.0')).toBe('latest')
    const pre = reader({ 'packages/quiver': '3.1.0-rc.0', 'packages/arrow-use': '0.1.2' })
    expect(resolveRelease({ ref: 'refs/tags/v3.1.0-rc.0', readVersion: pre })).toMatchObject({ distTag: 'next', publish: true })
  })

  it('names the real package directories and names', () => {
    for (const pkg of Object.values(PACKAGES)) {
      expect(JSON.parse(readFileSync(join(ROOT, pkg.dir, 'package.json'), 'utf8')).name).toBe(pkg.name)
    }
  })
})

describe('publish workflow (.github/workflows/publish.yml)', () => {
  it('triggers on exactly the release tag prefixes and a manual run', () => {
    expect(WORKFLOW).toContain(`tags: ['v*.*.*', 'arrow-use-v*.*.*']`)
    expect(Object.values(PACKAGES).map((p) => p.tagPrefix).sort()).toEqual(['arrow-use-v', 'v'])
    expect(WORKFLOW).toMatch(/workflow_dispatch:/)
  })

  it('pins every action to a full commit SHA with a version comment', () => {
    const uses = [...WORKFLOW.matchAll(/^\s*- uses: (.+)$/gm)].map((m) => m[1])
    expect(uses.length).toBeGreaterThan(0)
    for (const u of uses) expect(u).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/)
  })

  it('grants nothing by default and the OIDC token only to the stage job', () => {
    expect(WORKFLOW).toMatch(/^permissions: \{\}$/m)
    expect(WORKFLOW.match(/id-token: write/g)).toHaveLength(1)
    expect(job('stage')).toMatch(/permissions:\n\s+id-token: write\n/)
    expect(job('build')).toMatch(/permissions:\n\s+contents: read\n/)
    expect(WORKFLOW).not.toMatch(/secrets\.|NODE_AUTH_TOKEN|NPM_TOKEN|registry-url/)
  })

  it('stages only from a release tag, behind the switch-over variable and the npm environment', () => {
    const stage = job('stage')
    expect(stage).toContain(`if: \${{ needs.build.outputs.publish == 'true' && vars.NPM_PUBLISH_FROM_CI == 'true' }}`)
    expect(stage).toMatch(/environment: npm\n/)
    expect(WORKFLOW).toMatch(/default: true\n/)
  })

  it('runs no repository code where the OIDC token exists', () => {
    const stage = job('stage')
    expect(stage).not.toMatch(/actions\/checkout|setup-bun|bun |npm (ci|install)|scripts\//)
    expect(stage).toContain('npm stage publish --ignore-scripts --provenance --access public --tag "$DIST_TAG"')
    expect(stage).not.toMatch(/npm publish/)
  })

  it('stages the tarball the build job checked, unchanged', () => {
    const build = job('build')
    for (const step of ['bun run typecheck', 'bun run test', 'bun run pack:check', 'node scripts/release-check.js', 'git merge-base --is-ancestor']) {
      expect(build, step).toContain(step)
    }
    expect(build).toMatch(/persist-credentials: false/)
    expect(job('stage')).toMatch(/sha256sum -c SHA256SUMS[\s\S]*diff \.\.\/built\.txt \.\.\/repacked\.txt/)
  })

  it('never interpolates inputs into a shell command', () => {
    const runs = [...WORKFLOW.matchAll(/run: (?:\|\n((?:\s{10,}.*\n)+)|(.*))/g)].map((m) => m[1] ?? m[2])
    for (const r of runs) expect(r).not.toMatch(/\$\{\{/)
  })
})

// Audit S32-05 (N230): the exact tagged commit passes every pull-request check before it
// can be staged, and the GitHub settings that back it are reviewed JSON.
describe('full checks before staging (S32-05)', () => {
  /** The job names of checks.yml, in order. */
  const checkJobs = () => [...CHECKS.split(/\njobs:\n/)[1].matchAll(/^ {2}([a-z0-9-]+):$/gm)].map((m) => m[1])

  it('checks.yml is a read-only reusable workflow holding every check', () => {
    expect(CHECKS).toMatch(/^on:\n {2}workflow_call:\n/m)
    expect(CHECKS).not.toMatch(/^ {2}(push|pull_request|workflow_dispatch):/m)
    expect(CHECKS).toMatch(/^permissions:\n {2}contents: read\n/m)
    expect(CHECKS).not.toMatch(/: write/)
    expect(checkJobs()).toEqual(['unit', 'audit', 'e2e', 'browsers', 'pack', 'screenshots'])
    for (const step of ['bun run typecheck', 'bun run test', 'bun run audit', 'bun run test:e2e', 'bun run test:browsers', 'bun run pack:try', 'bun run test:visual']) {
      expect(CHECKS, step).toContain(step)
    }
  })

  it('Tests runs checks.yml and keeps only the baseline re-capture itself', () => {
    expect(job('checks', TESTS)).toMatch(/uses: \.\/\.github\/workflows\/checks\.yml\n {4}permissions:\n {6}contents: read\n/)
    expect([...TESTS.split(/\njobs:\n/)[1].matchAll(/^ {2}([a-z0-9-]+):$/gm)].map((m) => m[1])).toEqual(['checks', 'screenshots-capture', 'screenshots-commit'])
    for (const pinned of [CHECKS, TESTS]) {
      for (const u of [...pinned.matchAll(/^\s*- uses: (.+)$/gm)].map((m) => m[1])) expect(u).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/)
    }
  })

  it('Publish runs checks.yml on the release and stages only after it passes', () => {
    const checks = job('checks')
    expect(checks).toContain('needs: build')
    expect(checks).toContain(`if: \${{ needs.build.outputs.publish == 'true' && vars.NPM_PUBLISH_FROM_CI == 'true' }}`)
    expect(checks).toMatch(/uses: \.\/\.github\/workflows\/checks\.yml\n {4}permissions:\n {6}contents: read\n/)
    expect(checks).not.toMatch(/id-token|write/)
    const stage = job('stage')
    expect(stage).toMatch(/needs: \[build, checks\]\n/)
    // No status function in the condition, so GitHub adds success(): a skipped or failed `checks` skips stage.
    expect(stage).not.toMatch(/always\(\)|failure\(\)|cancelled\(\)|!cancelled/)
  })

  it('the main ruleset requires every check of checks.yml, from GitHub Actions', () => {
    const main = setting('main-ruleset.json')
    expect(main).toMatchObject({ target: 'branch', enforcement: 'active', bypass_actors: [], conditions: { ref_name: { include: ['~DEFAULT_BRANCH'] } } })
    const types = main.rules.map((/** @type {{ type: string }} */ r) => r.type)
    expect(types).toEqual(expect.arrayContaining(['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks']))
    const required = main.rules.find((/** @type {{ type: string }} */ r) => r.type === 'required_status_checks').parameters.required_status_checks
    expect(required.map((/** @type {{ context: string }} */ c) => c.context)).toEqual(checkJobs().map((j) => `checks / ${j}`))
    for (const c of required) expect(c.integration_id).toBe(15368)
  })

  it('release tags are admin-only, and the npm environment takes only release tags', () => {
    const tags = setting('release-tags-ruleset.json')
    expect(tags).toMatchObject({ target: 'tag', enforcement: 'active', bypass_actors: [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }] })
    const prefixes = Object.values(PACKAGES).map((p) => `refs/tags/${p.tagPrefix}*.*.*`).sort()
    expect([...tags.conditions.ref_name.include].sort()).toEqual(prefixes)
    expect(tags.rules.map((/** @type {{ type: string }} */ r) => r.type).sort()).toEqual(['creation', 'deletion', 'update'])
    expect(setting('npm-environment.json').deployment_branch_policy).toEqual({ protected_branches: false, custom_branch_policies: true })
    const releasing = readFileSync(join(ROOT, 'RELEASING.md'), 'utf8')
    for (const p of Object.values(PACKAGES)) {
      expect(releasing).toContain(`deployment-branch-policies -f name='${p.tagPrefix}*.*.*' -f type=tag`)
    }
    for (const f of ['main-ruleset.json', 'release-tags-ruleset.json', 'npm-environment.json']) expect(releasing).toContain(`.github/settings/${f}`)
  })
})
