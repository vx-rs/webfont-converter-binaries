# VX Webfont Converter WASI compatibility fallback

This package contains the platform-independent WASI build of `wfc`. It is
installed automatically and consumed by `@vx.rs/webfont-converter` only when
no compatible native binary can run. The fallback is slower than a native
binary.

Install `@vx.rs/webfont-converter` instead of this package directly.
