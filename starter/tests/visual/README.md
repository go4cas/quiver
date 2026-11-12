# Visual parity

Screenshots of every page state in 5 themes × 2 modes (planning/v3/DESIGN.md §8).
The baseline in `__screenshots__/` is only valid inside the pinned Playwright image,
`mcr.microsoft.com/playwright:v1.63.0-noble`, which CI pins by digest
(`@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27`). Captures from macOS, Windows or a plain
Linux runner differ in fonts and anti-aliasing, so never commit them.

- **CI** runs `bun run test:visual` in that image (`screenshots` job in `.github/workflows/checks.yml`,
  which the `Tests` workflow runs on every pull request and `Publish` on every release tag).
- **Re-capture** after an intended visual change: run the `Tests` workflow by hand on your
  branch with `update-screenshots` ticked. The `screenshots-capture` job renders them with a
  read-only token and uploads them; `screenshots-commit`, which installs and runs nothing,
  checks the artifact holds only PNGs and commits them back to the branch (never to `main`).
  Review the image diff in the PR.
- **Locally**, run the same image with Docker from the repo root (after `bun install`):

  ```sh
  docker run --rm --ipc=host -v "$PWD":/work -w /work -e CI=1 \
    -v "$(which bun)":/usr/local/bin/bun \
    mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27 \
    bun run test:visual
  ```

## Bumping Playwright

The image tag must match `@playwright/test` in `bun.lock` exactly: a newer Playwright looks
for a Chromium build the old image doesn't have, and every test fails with
`Executable doesn't exist at /ms-playwright/chromium_headless_shell-…`. Dependabot ignores
`@playwright/test` for this reason, so bump it by hand in one PR:

1. Set the same version in `package.json` and `starter/package.json`, then `bun install`.
2. Change every `image:` reference in `.github/workflows/checks.yml` (`browsers`, `screenshots`)
   and `.github/workflows/test.yml` (`screenshots-capture`), and the tag and digest in this README. Keep the `v<version>-noble@sha256:…` form: the tag documents the pairing, the
   digest is what Docker pulls. Read the new digest (the multi-arch index) with
   `docker buildx imagetools inspect mcr.microsoft.com/playwright:v<version>-noble`.
3. Run the `Tests` workflow on the branch with `update-screenshots` ticked, and review
   the image diff.

Tolerance is `threshold: 0.02`, `maxDiffPixelRatio: 0.0001` (approved in the Design PR, D35).
Don't loosen it.
