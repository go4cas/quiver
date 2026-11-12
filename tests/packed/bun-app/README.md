# Packed Bun app (R32-12)

A small conventions-mode app (`quiver:app`) built with a real `Bun.build`
(`splitting: true`) and `@go4cas/quiver/bun`. It is not an example and not a
workspace: `bun run pack:try` copies it out of the repo, installs the packed
tarballs, typechecks it and runs its Playwright suite at `/` (port 5186) and
`/sub/app/` (port 5196). The suite checks the layout, the navigation generated
from `meta.nav`, a section guard (`pages/private/_middleware.js`), that pages
load as separate chunks, and that a broken source folder fails the build with
the scanner's diagnostic.

`examples/bun` stays on the manual `quiver:routes` setup.
