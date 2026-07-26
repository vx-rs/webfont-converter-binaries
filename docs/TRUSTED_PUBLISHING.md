# npm Trusted Publishing

This repository publishes six public native packages and one WASI fallback from
`.github/workflows/ci.yml`:

- `@vx.rs/webfont-converter-bin-linux-x64`
- `@vx.rs/webfont-converter-bin-linux-arm64`
- `@vx.rs/webfont-converter-bin-darwin-x64`
- `@vx.rs/webfont-converter-bin-darwin-arm64`
- `@vx.rs/webfont-converter-bin-win32-x64`
- `@vx.rs/webfont-converter-bin-win32-arm64`
- `@vx.rs/webfont-converter-wasi`

Each package needs its own npm trusted publisher with these exact values:

- Provider: GitHub Actions
- Organization: `vx-rs`
- Repository: `webfont-converter-binaries`
- Workflow filename: `ci.yml`
- Environment: none
- Allowed action: `npm publish`

The workflow runs on GitHub-hosted runners with `id-token: write`, Node 24,
and the public npm registry. It publishes directly with `npm publish`; no
long-lived token is needed after trusted publishing is configured.

## First Release Bootstrap

npm requires a package to exist before a trusted publisher can be attached.
For the initial `1.0.0` release only:

1. Create a temporary granular npm token that can publish public packages under
   the `vx.rs` organization.
2. Store it as the `NPM_BOOTSTRAP_TOKEN` Actions secret in this repository and
   in `vx-rs/webfont-converter-node`.
3. Run the normal Rust `v1.0.0` release chain. The npm CLI uses OIDC when a
   trusted publisher exists and otherwise falls back to this temporary token.
4. After all eight packages exist, configure each trusted publisher.
5. Delete both `NPM_BOOTSTRAP_TOKEN` secrets and revoke the token immediately.
6. In each npm package's Publishing access settings, require two-factor
   authentication and disallow token-based publishing.

An authenticated maintainer can configure each connection through npm package
settings or with npm CLI 11.5.1 or newer:

```sh
npm trust github @vx.rs/webfont-converter-bin-linux-x64 --repo vx-rs/webfont-converter-binaries --file ci.yml --allow-publish
```

Repeat the command for every package listed above.

The trusted publisher configuration is registry state and cannot be completed
by committing repository files alone.
