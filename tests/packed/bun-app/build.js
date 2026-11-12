// Bundles src/main.js into dist/ with Bun.build: one chunk per page (splitting),
// with the app manifest from @go4cas/quiver/bun (quiver:app).
//
//   bun build.js                          # src/ → dist/
//   QUIVER_SRC=… QUIVER_OUT=… bun build.js  # another source folder (the error test)
//
// A failed build prints each message on stderr and exits 1.
import quiver from '@go4cas/quiver/bun'

const srcDir = process.env.QUIVER_SRC ?? 'src'
try {
  const result = await Bun.build({
    entrypoints: [`${srcDir}/main.js`],
    outdir: process.env.QUIVER_OUT ?? 'dist',
    splitting: true,
    minify: true,
    plugins: [quiver({ srcDir })],
  })
  if (!result.success) {
    for (const log of result.logs) console.error(String(log.message ?? log))
    process.exit(1)
  }
  console.log(`dist/: ${result.outputs.map((o) => o.path.split('/').pop()).join(', ')}`)
} catch (error) {
  const errors = error instanceof AggregateError ? error.errors : [error]
  for (const e of errors) console.error(e instanceof Error ? e.message : String(e?.message ?? e))
  process.exit(1)
}
