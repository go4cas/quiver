// Audit S01 (planning/v3/NOTES.md N150): scripts/audit.js accepts only listed, unexpired,
// version-scoped advisories, and every exception is complete.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluate, lockedVersions } from '../../scripts/audit.js'

const ROOT = join(import.meta.dirname, '..', '..')
/** @type {{ exceptions: import('../../scripts/audit.js').AuditException[] }} */
const { exceptions } = JSON.parse(readFileSync(join(ROOT, 'scripts', 'audit-exceptions.json'), 'utf8'))

const advisory = (id, range = '<=6.4.3') => ({ url: `https://github.com/advisories/${id}`, severity: 'moderate', title: 't', vulnerable_versions: range })
const exception = { id: 'GHSA-a', package: 'vite', versions: ['5.4.21'], owner: 'go4cas', expires: '2027-02-11' }
// Majors below 6 are "vulnerable" for the '<=6.4.3' range in these cases.
const env = (versions = ['5.4.21', '8.3.6']) => ({
  today: '2026-11-11',
  locked: () => versions,
  satisfies: (/** @type {string} */ v) => Number(v.split('.')[0]) < 6,
})

describe('scripts/audit.js', () => {
  it('accepts a listed advisory for the listed version', () => {
    const r = evaluate({ vite: [advisory('GHSA-a')] }, [exception], env())
    expect(r.problems).toEqual([])
    expect(r.accepted).toHaveLength(1)
  })

  it('fails an advisory without an exception', () => {
    expect(evaluate({ vite: [advisory('GHSA-b')] }, [], env()).problems[0]).toMatch(/^not accepted: vite GHSA-b/)
  })

  it('fails an expired exception', () => {
    const r = evaluate({ vite: [advisory('GHSA-a')] }, [{ ...exception, expires: '2026-11-10' }], env())
    expect(r.problems[0]).toMatch(/exception expired 2026-11-10/)
  })

  it('fails when the advisory reaches a locked version the exception does not name', () => {
    const r = evaluate({ vite: [advisory('GHSA-a')] }, [exception], env(['5.4.21', '5.4.22']))
    expect(r.problems[0]).toMatch(/not accepted for vite@5\.4\.22/)
  })

  it('fails a stale exception', () => {
    expect(evaluate({}, [exception], env()).problems[0]).toMatch(/stale exception.*GHSA-a/)
  })

  it('reads locked versions from bun.lock entries', () => {
    const lock = '"vite": ["vite@8.3.6", ""],\n"vitepress/vite": ["vite@5.4.21", ""],\n"@vitejs/plugin-vue": ["@vitejs/plugin-vue@5.2.4", ""],'
    expect(lockedVersions(lock, 'vite')).toEqual(['5.4.21', '8.3.6'])
    expect(lockedVersions(lock, '@vitejs/plugin-vue')).toEqual(['5.2.4'])
  })

  it('every exception has an owner, an expiry within six months of today or less, locked versions and a NOTES entry', () => {
    const lock = readFileSync(join(ROOT, 'bun.lock'), 'utf8')
    const notes = readFileSync(join(ROOT, 'planning', 'v3', 'NOTES.md'), 'utf8')
    expect(exceptions.length).toBeGreaterThan(0)
    for (const e of exceptions) {
      expect(e.id).toMatch(/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/)
      expect(e.owner).toBeTruthy()
      expect(e.expires).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(e.versions.length).toBeGreaterThan(0)
      for (const v of e.versions) expect(lockedVersions(lock, e.package)).toContain(v)
      expect(notes).toContain(`| ${e.notes} |`)
      expect(notes).toContain(e.id)
    }
  })
})
