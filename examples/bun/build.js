// Bundles src/main.js into dist/ with Bun.build: one chunk per page (splitting),
// with the route manifest from @go4cas/quiver/bun.
//
//   bun build.js
import quiver from '@go4cas/quiver/bun'

const result = await Bun.build({
  entrypoints: ['src/main.js'],
  outdir: 'dist',
  splitting: true,
  minify: true,
  plugins: [quiver()],
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
console.log(`dist/: ${result.outputs.map((o) => o.path.split('/').pop()).join(', ')}`)
