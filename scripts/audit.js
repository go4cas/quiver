// `bun run audit` (audit S01, planning/v3/NOTES.md N150): runs `bun audit` on the whole
// lockfile and fails on any advisory that scripts/audit-exceptions.json does not accept.
// An exception names the advisory, the package and the exact locked versions it covers,
// an owner and an expiry date. The check also fails when an exception has expired, when
// the advisory now matches a locked version the exception doesn't name, or when the audit
// no longer reports it (delete the entry). Runs on Bun (Bun.semver).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * @typedef {{ url: string, severity: string, title: string, vulnerable_versions: string }} Advisory
 * @typedef {Record<string, Advisory[]>} AuditReport
 * @typedef {{ id: string, package: string, versions: string[], owner: string, expires: string, via?: string, notes?: string }} AuditException
 * @typedef {{ problems: string[], accepted: string[] }} AuditResult
 */

/** @param {string} url */
export const advisoryId = (url) => url.slice(url.lastIndexOf('/') + 1)

/**
 * The versions of a package resolved in bun.lock.
 * @param {string} lock
 * @param {string} name
 * @returns {string[]}
 */
export function lockedVersions(lock, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  const found = new Set([...lock.matchAll(new RegExp(`\\["${escaped}@(\\d[^"]*)"`, 'g'))].map((m) => m[1]))
  return [...found].sort()
}

/**
 * @param {AuditReport} report  `bun audit --json`
 * @param {AuditException[]} exceptions
 * @param {{ today: string, locked: (name: string) => string[], satisfies: (version: string, range: string) => boolean }} env
 * @returns {AuditResult}
 */
export function evaluate(report, exceptions, { today, locked, satisfies }) {
  /** @type {string[]} */ const problems = []
  /** @type {string[]} */ const accepted = []
  const reported = new Set()
  for (const [pkg, advisories] of Object.entries(report)) {
    for (const advisory of advisories) {
      const id = advisoryId(advisory.url)
      reported.add(`${pkg} ${id}`)
      const label = `${pkg} ${id} (${advisory.severity}, ${advisory.vulnerable_versions}): ${advisory.title}`
      const exception = exceptions.find((e) => e.id === id && e.package === pkg)
      if (!exception) { problems.push(`not accepted: ${label}`); continue }
      if (exception.expires < today) { problems.push(`exception expired ${exception.expires} (owner ${exception.owner}): ${label}`); continue }
      const affected = locked(pkg).filter((v) => satisfies(v, advisory.vulnerable_versions))
      const uncovered = affected.filter((v) => !exception.versions.includes(v))
      if (uncovered.length) { problems.push(`not accepted for ${pkg}@${uncovered.join(', ')}: ${label}`); continue }
      accepted.push(`${label} [owner ${exception.owner}, expires ${exception.expires}]`)
    }
  }
  for (const e of exceptions) {
    if (!reported.has(`${e.package} ${e.id}`)) problems.push(`stale exception, no longer reported: ${e.package} ${e.id} (remove it from scripts/audit-exceptions.json)`)
  }
  return { problems, accepted }
}

if (import.meta.main) {
  const root = join(import.meta.dirname, '..')
  /** @type {{ exceptions: AuditException[] }} */
  const { exceptions } = JSON.parse(readFileSync(join(import.meta.dirname, 'audit-exceptions.json'), 'utf8'))
  const lock = readFileSync(join(root, 'bun.lock'), 'utf8')
  /** @type {string} */
  let out
  try {
    out = execFileSync('bun', ['audit', '--json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  } catch (error) {
    // bun audit exits 1 when it finds advisories; the JSON is still on stdout.
    out = /** @type {{ stdout?: string }} */ (error).stdout ?? ''
    if (!out.trim()) throw error
  }
  const report = /** @type {AuditReport} */ (JSON.parse(out || '{}'))
  const today = new Date().toISOString().slice(0, 10)
  // @ts-ignore Bun global, not in the node typings this folder is checked with
  const satisfies = (/** @type {string} */ v, /** @type {string} */ r) => Bun.semver.satisfies(v, r)
  const { problems, accepted } = evaluate(report, exceptions, { today, locked: (name) => lockedVersions(lock, name), satisfies })
  for (const line of accepted) console.log(`accepted  ${line}`)
  for (const line of problems) console.error(`FAIL      ${line}`)
  console.log(`${accepted.length} accepted, ${problems.length} failing`)
  process.exit(problems.length ? 1 : 0)
}
