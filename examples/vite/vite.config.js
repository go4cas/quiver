import { defineConfig } from 'vite'
import quiver from '@go4cas/quiver/vite'

// quiver() serves `quiver:routes`, the route manifest for src/pages/.
// QUIVER_BASE serves the app under a sub-path: QUIVER_BASE=/sub/app/ bun run dev
export default defineConfig({
  base: process.env.QUIVER_BASE ?? '/',
  plugins: [quiver()],
})
