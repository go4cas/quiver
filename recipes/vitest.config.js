import { defineConfig } from 'vitest/config'

// Recipe unit tests, one tests/ folder per recipe (never copied into apps or the
// tarball, X-10), plus the registry checks in tests/.
export default defineConfig({
  test: {
    include: ['*/tests/**/*.test.js', 'tests/**/*.test.js'],
    environment: 'jsdom',
  },
})
