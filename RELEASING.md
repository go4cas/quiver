# Releasing

Quiver publishes two npm packages from this repo: `@go4cas/quiver` (`packages/quiver/`) and `arrow-use` (`packages/arrow-use/`). Publishing, tags and GitHub releases happen only with the maintainer's go-ahead.

There are two ways to publish. The `Publish` workflow (`.github/workflows/publish.yml`) stages releases from CI with npm provenance; until the maintainer switches it on (step 2 below), releases are published from the maintainer's machine as before. Both end the same way: a staged version that goes live only when the maintainer approves it on npmjs.com with 2FA.

## Prepare the release (both ways)

1. A release PR on its own branch: bump `version` in the package's `package.json`, move `## [Unreleased]` in `CHANGELOG.md` under the new version and date, add the compare link, and update the version check in `tests/repo/core-config.test.js` (core) or `tests/repo/packages.test.js` (arrow-use).
2. CI green on the PR (`Tests`, including `screenshots` and `pack`), then merge to `main`.

## Publish from CI (once switched on)

### One-time setup on npmjs.com and GitHub

For **each** package (`@go4cas/quiver`, `arrow-use`):

1. On npmjs.com: **Packages → the package → Settings → Trusted publishing**, under *Select your publisher* choose **GitHub Actions**, and enter exactly (every field is case-sensitive):
   - Organization or user: `go4cas`
   - Repository: `quiver`
   - Workflow filename: `publish.yml`
   - Environment name: `npm`
   - Allowed actions: leave `npm publish` and `npm dist-tag` **off**. `npm stage publish` is always allowed, so CI can only stage; a release still needs your 2FA approval.
2. Same page, **Publishing access**: choose **Require two-factor authentication and disallow tokens**. This does not affect the trusted publisher. Then revoke any npm automation or publish tokens you no longer need (npmjs.com → Access Tokens).

A new trusted publisher that hasn't completed a successful publish within two days expires: if that happens, delete it and add it again.

On GitHub (`go4cas/quiver` → Settings):

3. **Environments → New environment** named `npm`. Optionally add yourself under *Required reviewers*, so every staging run waits for a click, and limit *Deployment branches and tags* to the tags `v*.*.*` and `arrow-use-v*.*.*`.
4. **Secrets and variables → Actions → Variables → New repository variable**: `NPM_PUBLISH_FROM_CI` = `true`. This is the switch: without it, a release tag only builds and verifies the tarball, and nothing is staged.

### Each release

1. After the release PR merges, tag the merge commit on `main` and push the tag:
   - `@go4cas/quiver`: `git tag v3.0.4 && git push origin v3.0.4`
   - `arrow-use`: `git tag arrow-use-v0.1.2 && git push origin arrow-use-v0.1.2`
2. The `Publish` workflow runs. Its `build` job checks that the tag matches the `package.json` version, the tagged commit is on `main` and the version isn't on npm yet, runs typecheck, unit tests and `pack:check`, and packs the tarball. Its `stage` job (no checkout, no install, no lifecycle scripts; only this job gets the OIDC token) unpacks that tarball, checks its checksum and file list, and runs `npm stage publish` with provenance. A prerelease version (`3.1.0-rc.0`) is staged on the `next` dist-tag, anything else on `latest`.
3. On npmjs.com, open the package's **Staged Packages** tab, review the staged version and click **Approve** (2FA). It goes live with a provenance badge linking to the workflow run and commit.
4. Create the GitHub release from the tag by hand, as before.

To try the build without staging anything, run the `Publish` workflow by hand (Actions → Publish → Run workflow) on any branch, pick the package, and leave **dry-run** ticked. The tarball is attached to the run as `npm-tarball`.

If a staging run fails after the tag is pushed (for example a trusted-publisher typo, which npm reports as `ENEEDAUTH` only at publish time), fix the cause and use **Re-run all jobs** on that run; the tag doesn't change.

## Publish from the maintainer's machine (until switched on)

From a clean checkout of the merged release commit on `main`, after `bun install --frozen-lockfile`:

```
cd packages/quiver      # or packages/arrow-use
npm publish             # or npm stage publish; prepack builds the .d.ts and copies the recipes in
```

Approve the staged version on npmjs.com if your account stages publishes, then tag the commit (`v<version>` or `arrow-use-v<version>`) and create the GitHub release. While `NPM_PUBLISH_FROM_CI` is unset, the tag push runs only the `Publish` workflow's `build` job, which re-checks and packs the release; it stages nothing. A version published this way has no provenance.
