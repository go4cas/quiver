# Releasing

Quiver publishes two npm packages from this repo: `@go4cas/quiver` (`packages/quiver/`) and `arrow-use` (`packages/arrow-use/`). Publishing, tags and GitHub releases happen only with the maintainer's go-ahead.

Releases are staged from CI: the `Publish` workflow (`.github/workflows/publish.yml`) stages each release with npm provenance when a release tag is pushed. It was switched on on 2026-11-11 (the setup below is done for both packages); publishing from the maintainer's machine remains as a fallback. Both end the same way: a staged version that goes live only when the maintainer approves it on npmjs.com with 2FA.

## Prepare the release (both ways)

1. A release PR on its own branch: bump `version` in the package's `package.json`, move `## [Unreleased]` in `CHANGELOG.md` under the new version and date, add the compare link, and update the version check in `tests/repo/core-config.test.js` (core) or `tests/repo/packages.test.js` (arrow-use).
2. CI green on the PR (`Tests`, including `screenshots` and `pack`), then merge to `main`.

## Publish from CI (the default)

### One-time setup on npmjs.com and GitHub

Done on 2026-11-11 for both packages. Kept here to check the settings, or to redo them if the trusted publisher expires.

For **each** package (`@go4cas/quiver`, `arrow-use`):

1. On npmjs.com: **Packages → the package → Settings → Trusted publishing**, under *Select your publisher* choose **GitHub Actions**, and enter exactly (every field is case-sensitive):
   - Organization or user: `go4cas`
   - Repository: `quiver`
   - Workflow filename: `publish.yml`
   - Environment name: `npm`
   - Allowed actions: leave `npm publish` and `npm dist-tag` **off**. `npm stage publish` is always allowed, so CI can only stage; a release still needs your 2FA approval.
2. Same page, **Publishing access**: choose **Require two-factor authentication and disallow tokens**. This does not affect the trusted publisher. Then revoke any npm automation or publish tokens you no longer need (npmjs.com → Access Tokens).

A new trusted publisher that hasn't completed a successful publish within two days expires: if that happens, delete it and add it again. Until the first release from CI succeeds, check this before pushing a release tag.

On GitHub (`go4cas/quiver` → Settings):

3. **Environments → New environment** named `npm`. Its tag policy is part of the repository settings below. Optionally add yourself under *Required reviewers*, so every staging run waits for a click.
4. **Secrets and variables → Actions → Variables → New repository variable**: `NPM_PUBLISH_FROM_CI` = `true`. This is the switch: without it, a release tag only builds and verifies the tarball, and nothing is staged.

### Repository settings (audit S32-05)

The `Publish` workflow already refuses a tag whose commit isn't on `main` and runs every check on that commit, but GitHub itself must also stop anyone else from moving `main`, creating or moving a release tag, or using the `npm` environment from another ref. Three settings do that; their JSON is in `.github/settings/`, so the files are what is reviewed and the commands below apply them:

- `main-ruleset.json`: `main` can't be deleted or force-pushed, changes land through a pull request, and the six `checks / …` jobs (`unit`, `audit`, `e2e`, `browsers`, `pack`, `screenshots`, from `checks.yml`) must pass, reported by GitHub Actions (app id 15368) so no other app can fake them. No bypass: to merge with a red check, change the ruleset first.
- `release-tags-ruleset.json`: only repository admins can create, move or delete `v*.*.*` and `arrow-use-v*.*.*` tags.
- `npm-environment.json` plus two tag policies: only the `v*.*.*` and `arrow-use-v*.*.*` tags may deploy to the `npm` environment, so the OIDC token npm trusts can't be had from a branch or another tag. With no policy added, nothing can deploy, so add both.

Apply them once with the GitHub CLI (`gh auth login` first) from an up-to-date `main` checkout, one command at a time:

```
gh api repos/go4cas/quiver/environments/npm
gh api -X POST repos/go4cas/quiver/rulesets --input .github/settings/main-ruleset.json
gh api -X POST repos/go4cas/quiver/rulesets --input .github/settings/release-tags-ruleset.json
gh api -X PUT repos/go4cas/quiver/environments/npm --input .github/settings/npm-environment.json
gh api -X POST repos/go4cas/quiver/environments/npm/deployment-branch-policies -f name='v*.*.*' -f type=tag
gh api -X POST repos/go4cas/quiver/environments/npm/deployment-branch-policies -f name='arrow-use-v*.*.*' -f type=tag
gh api repos/go4cas/quiver/environments/npm/deployment-branch-policies
gh api repos/go4cas/quiver/rulesets
```

The first command shows the environment before the change: if it lists required reviewers, check after the `PUT` that they are still there and re-add them on the environment page if not. The last two should show both tag policies and both rulesets. Without the CLI, the same settings are under **Settings → Rules → Rulesets** (or **Import a ruleset** with the JSON files) and **Settings → Environments → npm → Deployment branches and tags → Selected branches and tags → Add deployment branch or tag rule → Tag**.

If a check is renamed or added in `checks.yml`, update `main-ruleset.json` in the same PR and re-apply it: `gh api repos/go4cas/quiver/rulesets` lists the ruleset ids, and `gh api -X PUT repos/go4cas/quiver/rulesets/<id> --input .github/settings/main-ruleset.json` replaces it.

### Each release

1. After the release PR merges, tag the merge commit on `main` and push the tag:
   - `@go4cas/quiver`: `git tag v3.0.4 && git push origin v3.0.4`
   - `arrow-use`: `git tag arrow-use-v0.1.2 && git push origin arrow-use-v0.1.2`
2. The `Publish` workflow runs. Its `build` job checks that the tag matches the `package.json` version, the tagged commit is on `main` and the version isn't on npm yet, runs typecheck, unit tests and `pack:check`, and packs the tarball. Its `checks` job then runs the whole `Checks` workflow on the tagged commit, the same jobs a pull request needs (unit, audit, e2e, the three-engine browser suite, the packed consumers and screenshots); this takes about as long as a pull request's run, and a failure there stops the release before anything reaches npm (fix it on `main` with a new version and tag; re-run only a flaky job). Its `stage` job, which needs both (no checkout, no install, no lifecycle scripts; only this job gets the OIDC token), unpacks that tarball, checks its checksum and file list, and runs `npm stage publish` with provenance. A prerelease version (`3.1.0-rc.0`) is staged on the `next` dist-tag, anything else on `latest`.
3. On npmjs.com, open the package's **Staged Packages** tab, review the staged version and click **Approve** (2FA). It goes live with a provenance badge linking to the workflow run and commit.
4. Create the GitHub release from the tag by hand, as before.

To try the build without staging anything, run the `Publish` workflow by hand (Actions → Publish → Run workflow) on any branch, pick the package, and leave **dry-run** ticked. The tarball is attached to the run as `npm-tarball`; a dry run skips the full `checks` job and never reaches `stage`.

If a staging run fails after the tag is pushed (for example a trusted-publisher typo, which npm reports as `ENEEDAUTH` only at publish time), fix the cause and use **Re-run all jobs** on that run; the tag doesn't change.

## Publish from the maintainer's machine (fallback)

From a clean checkout of the merged release commit on `main`, after `bun install --frozen-lockfile`:

```
cd packages/quiver      # or packages/arrow-use
npm publish             # or npm stage publish; prepack builds the .d.ts and copies the recipes in
```

Approve the staged version on npmjs.com if your account stages publishes, then tag the commit (`v<version>` or `arrow-use-v<version>`) and create the GitHub release. A version published this way has no provenance. With `NPM_PUBLISH_FROM_CI` set to `true`, the tag push still runs the `Publish` workflow, and its `build` job fails at the "not on npm yet" check, so nothing is staged twice; to skip that red run, unset the variable before pushing the tag and set it back afterwards.
