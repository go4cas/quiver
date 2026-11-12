import { defineConfig } from 'vite'
import quiver from '@go4cas/quiver/vite'

// quiver() serves `quiver:app`, the app generated from src/ (main.js), and `quiver:routes`.
// QUIVER_BASE serves the app under a sub-path, e.g. QUIVER_BASE=/sub/app/.
// main.js passes import.meta.env.BASE_URL to createApp(), so no app code changes.
export default defineConfig({
  base: process.env.QUIVER_BASE ?? '/',
  plugins: [quiver()],
})
