import { defineConfig } from 'vitest/config'
import quiver from '@go4cas/quiver/vite'

export default defineConfig({
  plugins: [quiver()],
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
  },
})
