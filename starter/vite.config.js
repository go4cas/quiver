import { defineConfig } from 'vite'

// QUIVER_BASE serves the app under a sub-path, e.g. QUIVER_BASE=/sub/app/.
// main.js passes import.meta.env.BASE_URL to initRouter(), so no app code changes.
export default defineConfig({
  base: process.env.QUIVER_BASE ?? '/',
})
