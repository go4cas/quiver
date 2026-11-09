import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/framework/**/*.test.js', 'tests/composables/**/*.test.js', 'tests/repo/**/*.test.js'],
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
  },
})
