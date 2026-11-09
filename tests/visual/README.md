# Visual parity

Screenshots of every page state in 5 themes × 2 modes (planning/v3/DESIGN.md §8).
The baseline in `__screenshots__/` is only valid inside the pinned Playwright image,
`mcr.microsoft.com/playwright:v1.63.0-noble`. Captures from macOS, Windows or a plain
Linux runner differ in fonts and anti-aliasing, so never commit them.

- **CI** runs `bun run test:visual` in that image (`screenshots` job in `.github/workflows/test.yml`).
- **Re-capture** after an intended visual change: run the `Tests` workflow by hand on your
  branch with `update-screenshots` ticked. It commits the new PNGs back to the branch
  (never to `main`). Review the image diff in the PR.
- **Locally**, run the same image with Docker from the repo root (after `bun install`):

  ```sh
  docker run --rm --ipc=host -v "$PWD":/work -w /work -e CI=1 \
    -v "$(which bun)":/usr/local/bin/bun \
    mcr.microsoft.com/playwright:v1.63.0-noble bun run test:visual
  ```

Tolerance is `threshold: 0.02`, `maxDiffPixelRatio: 0.0001` (approved in the Design PR, D35).
Don't loosen it.
