// postpack (TECH-SPEC X-3): removes what prepack.js generated.
import { rmSync } from 'node:fs'
import { join } from 'node:path'

const PKG = join(import.meta.dirname, '..')
for (const dir of ['recipes', 'types']) rmSync(join(PKG, dir), { recursive: true, force: true })
