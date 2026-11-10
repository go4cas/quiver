import { defineConfig } from 'vitest/config'

// Root project: repo-wide checks only (TECH-SPEC W-10…W-13). Each workspace
// runs its own tests through `bun run --filter '*' test`.
export default defineConfig({
  test: {
    include: ['tests/repo/**/*.test.js'],
    environment: 'node',
  },
})
