---
name: Synchronized binary release
about: Track import and publication of a Rust-built binary release
title: "release: publish vX.Y.Z"
labels: RELEASE
assignees: vsjov
---

# Binary release vX.Y.Z

The private Rust tag is the only source of a stable binary-package version. Do
not publish or tag this repository independently.

## Pre-release checks

- [ ] Confirm the exact private Rust tag is `vX.Y.Z`.
- [ ] Confirm root `package.json` and all five native target manifests plus the
      WASI manifest use `X.Y.Z`.
- [ ] Run local checks:
  ```sh
  npm run format:check
  npm run lint
  npm test
  ```
- [ ] Confirm imported executables report `X.Y.Z`:
  ```sh
  npm run validate-release -- X.Y.Z
  for target in linux-x64 linux-arm64 darwin-arm64; do
    "packages/$target/bin/wfc" --version
  done
  for target in win32-x64 win32-arm64; do
    "packages/$target/bin/wfc.exe" --version
  done
  ```

## Completion checks

- [ ] Confirm CI imported artifacts, checksums, and `release-manifest.json`.
- [ ] Confirm all five `@vx.rs/webfont-converter-bin-<target>@X.Y.Z` packages
      and `@vx.rs/webfont-converter-wasi@X.Y.Z` are published.
- [ ] Confirm the wrapper dispatch received version `X.Y.Z` and tag `vX.Y.Z`.
