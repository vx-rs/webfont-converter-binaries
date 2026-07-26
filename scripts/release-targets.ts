// Types
// -----------------------------------------------------------------------------
export type ReleaseTarget = {
  architecture: "arm64" | "x64";
  executable: "wfc" | "wfc.exe";
  packageDirectory: string;
  platform: "darwin" | "linux" | "win32";
};

export type WasiReleaseTarget = {
  executable: "wfc.wasm";
  packageDirectory: "wasi";
};

export const RELEASE_TARGETS: ReleaseTarget[] = [
  { architecture: "x64", executable: "wfc", packageDirectory: "linux-x64", platform: "linux" },
  { architecture: "arm64", executable: "wfc", packageDirectory: "linux-arm64", platform: "linux" },
  { architecture: "x64", executable: "wfc", packageDirectory: "darwin-x64", platform: "darwin" },
  {
    architecture: "arm64",
    executable: "wfc",
    packageDirectory: "darwin-arm64",
    platform: "darwin",
  },
  { architecture: "x64", executable: "wfc.exe", packageDirectory: "win32-x64", platform: "win32" },
  {
    architecture: "arm64",
    executable: "wfc.exe",
    packageDirectory: "win32-arm64",
    platform: "win32",
  },
];

/** WASI Preview 1 compatibility fallback package metadata. */
export const WASI_RELEASE_TARGET: WasiReleaseTarget = {
  executable: "wfc.wasm",
  packageDirectory: "wasi",
};

export default RELEASE_TARGETS;
