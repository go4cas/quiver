import { defineConfig } from 'vitest/config'

// Unit tests run against bare @arrow-js/core (SPEC P6 Done-when). jsdom by
// default; tests/no-browser.test.js switches itself to 'node' (U-3, U-4).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'jsdom',
  },
})
