# Binary package release automation

The private Rust release is the only source of a stable binary-package
version. Do not independently tag or publish this repository.

The private workspace package, five public native target packages, and one
platform-independent WASI fallback package use the same version. For local
metadata maintenance, use:

```sh
npm run version:update -- patch
npm run version:update -- X.Y.Z
```

The import workflow invokes this updater before it writes checksums and the
release manifest. Configure the required npm trusted publishers as described
in [TRUSTED_PUBLISHING.md](./TRUSTED_PUBLISHING.md).
