import { defineConfig } from 'vitest/config'

// `bun run pack:check` (TECH-SPEC X-4, CI `pack` job): runs `npm pack --dry-run`
// for both published packages. Kept out of `bun run test` because each pack runs
// the package's prepack (tsc, recipe copy).
export default defineConfig({
  test: {
    include: ['tests/pack/**/*.test.js'],
    environment: 'node',
    testTimeout: 120_000,
    fileParallelism: false,
  },
})
