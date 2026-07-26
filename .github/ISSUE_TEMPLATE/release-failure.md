---
name: Report a binary release failure
about: Track a failed or incomplete synchronized native package release
title: "release: investigate vX.Y.Z"
labels: RELEASE
assignees: vsjov
---

# Binary release failure vX.Y.Z

- Rust source tag:
- Binary repository tag:
- Failed workflow run:
- Packages already published, if any:

## Failure

Describe the failed validation, publication, or wrapper dispatch step.

## Recovery checklist

- [ ] Do not overwrite or unpublish an immutable npm version.
- [ ] Confirm checksums and source commit in `release-manifest.json`.
- [ ] Confirm root `package.json` and all six target manifests use the same
      release version.
- [ ] Validate the synchronized imported release:
  ```sh
  npm run validate-release -- X.Y.Z
  ```
- [ ] Confirm which of the six package versions exist on npm:
  ```sh
  for target in linux-x64 linux-arm64 darwin-x64 darwin-arm64 win32-x64 win32-arm64; do
    npm view "@vx.rs/webfont-converter-bin-$target@X.Y.Z" version \
      --registry=https://registry.npmjs.org
  done
  ```
- [ ] Stop wrapper publication until all six matching versions exist.
- [ ] If any package was published, prepare a corrected new Rust patch version.
- [ ] Record the final resolution and close this issue.
