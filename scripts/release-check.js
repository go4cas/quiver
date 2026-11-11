// Release resolution for .github/workflows/publish.yml (audit S05, planning/v3/NOTES.md N165).
// Reads the ref the workflow runs on and decides which package to pack, its version and
// npm dist-tag, and whether the run may stage a publish. Only a release tag may: `v<version>`
// for @go4cas/quiver, `arrow-use-v<version>` for arrow-use, and the tag's version must equal
// the package.json version. Any other ref (a branch, a manual dry run) packs and verifies only.
//
// In CI: `node scripts/release-check.js` with REF, PACKAGE and DRY_RUN in the environment;
// the result is appended to $GITHUB_OUTPUT as key=value lines.
import { appendFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = join(import.meta.dirname, '..')

/**
 * @typedef {{ dir: string, name: string, tagPrefix: string }} ReleasePackage
 * @typedef {{ key: string, dir: string, name: string, version: string, distTag: string, publish: boolean }} Release
 */

/** @type {Record<string, ReleasePackage>} */
export const PACKAGES = {
  quiver: { dir: 'packages/quiver', name: '@go4cas/quiver', tagPrefix: 'v' },
  'arrow-use': { dir: 'packages/arrow-use', name: 'arrow-use', tagPrefix: 'arrow-use-v' },
}

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

/**
 * @param {{ ref: string, input?: string, dryRun?: boolean, readVersion: (dir: string) => string }} options
 *   `ref` is GITHUB_REF; `input` the workflow_dispatch package (ignored on a tag unless it disagrees);
 *   `dryRun` the workflow_dispatch dry-run box.
 * @returns {Release}
 */
export function resolveRelease({ ref, input = '', dryRun = false, readVersion }) {
  if (input && !(input in PACKAGES)) throw new Error(`Unknown package "${input}"`)
  const tag = ref.startsWith('refs/tags/') ? ref.slice('refs/tags/'.length) : null

  if (tag === null) {
    const key = input || 'quiver'
    const pkg = PACKAGES[key]
    const version = readVersion(pkg.dir)
    return { key, dir: pkg.dir, name: pkg.name, version, distTag: distTag(version), publish: false }
  }

  // Longest prefix first, so `arrow-use-v1.0.0` is never read as a `v` tag.
  const [key, pkg] = Object.entries(PACKAGES)
    .sort(([, a], [, b]) => b.tagPrefix.length - a.tagPrefix.length)
    .find(([, p]) => tag.startsWith(p.tagPrefix)) ?? []
  if (!key || !pkg) throw new Error(`Tag "${tag}" is not a release tag (v<version> or arrow-use-v<version>)`)
  const tagVersion = tag.slice(pkg.tagPrefix.length)
  if (!SEMVER.test(tagVersion)) throw new Error(`Tag "${tag}" does not end in a version`)
  if (input && input !== key) throw new Error(`Tag "${tag}" releases ${key}, but the run asked for ${input}`)
  const version = readVersion(pkg.dir)
  if (version !== tagVersion) {
    throw new Error(`Tag "${tag}" is ${tagVersion}, but ${pkg.dir}/package.json is ${version}`)
  }
  return { key, dir: pkg.dir, name: pkg.name, version, distTag: distTag(version), publish: !dryRun }
}

/**
 * A prerelease goes to `next`, so `npm install` never picks it up by default.
 * @param {string} version
 */
export const distTag = (version) => (version.includes('-') ? 'next' : 'latest')

/** @param {string} dir repo-relative */
const readVersion = (dir) => JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8')).version

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const release = resolveRelease({
      ref: process.env.REF ?? '',
      input: process.env.PACKAGE ?? '',
      dryRun: process.env.DRY_RUN === 'true',
      readVersion,
    })
    const lines = [
      `dir=${release.dir}`,
      `name=${release.name}`,
      `version=${release.version}`,
      `dist-tag=${release.distTag}`,
      `publish=${release.publish}`,
    ]
    console.log(lines.join('\n'))
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`)
  } catch (e) {
    console.error(`::error::${/** @type {Error} */ (e).message}`)
    process.exit(1)
  }
}
