# VX Webfont Converter Binaries

Public, target-specific npm packages for the private VX Webfont Converter Rust
build. This repository contains release executables and public legal metadata,
not Rust source code.

Install the launcher instead of a target package directly:

```sh
npm install @vx.rs/webfont-converter
```

The launcher selects a runnable native optional package for the current
platform. Supported packages cover Linux x64 and arm64, macOS arm64, and
Windows x64 and arm64. If no native binary can run, it uses the slower
platform-independent WASI compatibility fallback.

Published packages contain either a target-specific native executable or the
platform-independent WASI module, together with legal materials.
