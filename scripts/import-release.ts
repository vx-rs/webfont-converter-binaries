// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Internal
import { updatePackageVersion, validateVersion } from "./package-version-update.ts";
import { RELEASE_TARGETS, WASI_RELEASE_TARGET } from "./release-targets.ts";

// Types
import type { ReleaseTarget } from "./release-targets.ts";

type ImportReleaseOptions = {
  source: string;
  sourceCommit: string;
  version: string;
};

type ReleaseTargetManifest = {
  executable: string;
  package: string;
  sha256: string;
  target: string;
};

const CURRENT_FILE = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(CURRENT_FILE), "..");

/**
 * Imports approved private Rust release files into the public package workspace.
 * @param options - Release source and identity.
 * @returns Nothing.
 * @throws When the source layout, version, or package metadata is invalid.
 */
export const importRelease = ({ source, sourceCommit, version }: ImportReleaseOptions): void => {
  validateVersion(version);
  updatePackageVersion(REPOSITORY_ROOT, version);

  const targets: ReleaseTargetManifest[] = RELEASE_TARGETS.map((target) => {
    const packageDirectory = join(REPOSITORY_ROOT, "packages", target.packageDirectory);
    const sourceBinary = join(source, target.packageDirectory, target.executable);
    const destinationBinary = join(packageDirectory, "bin", target.executable);

    if (!existsSync(sourceBinary)) {
      throw new Error(`Missing approved release binary: ${sourceBinary}`);
    }

    mkdirSync(dirname(destinationBinary), { recursive: true });
    copyFileSync(sourceBinary, destinationBinary);
    if (target.platform !== "win32") chmodSync(destinationBinary, 0o755);
    syncPackageFiles(REPOSITORY_ROOT, packageDirectory, target);

    return {
      executable: `bin/${target.executable}`,
      package: readPackageName(packageDirectory),
      sha256: sha256File(destinationBinary),
      target: target.packageDirectory,
    };
  });
  targets.push(importWasiRelease(REPOSITORY_ROOT, source));

  writeFileSync(
    join(REPOSITORY_ROOT, "release-manifest.json"),
    `${JSON.stringify({ schemaVersion: 1, sourceCommit, version, targets }, null, 2)}\n`,
  );
};

/**
 * Imports the platform-independent WASI compatibility fallback.
 * @param repositoryRoot - Public binary repository root.
 * @param source - Prepared private release directory.
 * @returns Release manifest entry for the WASI package.
 * @throws When the prepared fallback module is absent.
 */
const importWasiRelease = (repositoryRoot: string, source: string): ReleaseTargetManifest => {
  const packageDirectory = join(repositoryRoot, "packages", WASI_RELEASE_TARGET.packageDirectory);
  const sourceModule = join(
    source,
    WASI_RELEASE_TARGET.packageDirectory,
    WASI_RELEASE_TARGET.executable,
  );
  const destinationModule = join(packageDirectory, WASI_RELEASE_TARGET.executable);

  if (!existsSync(sourceModule)) {
    throw new Error(`Missing approved WASI fallback module: ${sourceModule}`);
  }

  copyFileSync(sourceModule, destinationModule);
  syncWasiPackageFiles(repositoryRoot, packageDirectory);

  return {
    executable: WASI_RELEASE_TARGET.executable,
    package: readPackageName(packageDirectory),
    sha256: sha256File(destinationModule),
    target: WASI_RELEASE_TARGET.packageDirectory,
  };
};

/**
 * Synchronizes generated legal files, checksums, and README content for one target package.
 * @param repositoryRoot - Public binary repository root.
 * @param packageDirectory - Target package directory.
 * @param target - Release target metadata.
 * @returns Nothing.
 */
const syncPackageFiles = (
  repositoryRoot: string,
  packageDirectory: string,
  target: ReleaseTarget,
): void => {
  syncLegalFiles(repositoryRoot, packageDirectory);

  const binaryPath = join(packageDirectory, "bin", target.executable);
  writeFileSync(
    join(packageDirectory, "SHA256SUMS"),
    `${sha256File(binaryPath)}  bin/${target.executable}\n`,
  );
  writeFileSync(
    join(packageDirectory, "README.md"),
    "# VX Webfont Converter binary for " +
      target.packageDirectory +
      "\n\nThis package contains the native `wfc` binary built for `" +
      target.packageDirectory +
      "`. It is\ninstalled automatically and consumed by `@vx.rs/webfont-converter` on this\nplatform.\n\nInstall `@vx.rs/webfont-converter` instead of this target package directly.\n",
  );
};

/**
 * Synchronizes generated legal files, checksums, and README content for WASI.
 * @param repositoryRoot - Public binary repository root.
 * @param packageDirectory - WASI package directory.
 * @returns Nothing.
 */
const syncWasiPackageFiles = (repositoryRoot: string, packageDirectory: string): void => {
  syncLegalFiles(repositoryRoot, packageDirectory);
  const modulePath = join(packageDirectory, WASI_RELEASE_TARGET.executable);
  writeFileSync(
    join(packageDirectory, "SHA256SUMS"),
    `${sha256File(modulePath)}  ${WASI_RELEASE_TARGET.executable}\n`,
  );
  writeFileSync(
    join(packageDirectory, "README.md"),
    "# VX Webfont Converter WASI compatibility fallback\n\nThis package contains the platform-independent WASI build of `wfc`. It is\ninstalled automatically and consumed by `@vx.rs/webfont-converter` only when\nno compatible native binary can run. The fallback is slower than a native\nbinary.\n\nInstall `@vx.rs/webfont-converter` instead of this package directly.\n",
  );
};

/**
 * Copies shared legal files into one published package.
 * @param repositoryRoot - Public binary repository root.
 * @param packageDirectory - Published package directory.
 * @returns Nothing.
 */
const syncLegalFiles = (repositoryRoot: string, packageDirectory: string): void => {
  for (const fileName of ["LICENSE", "NOTICE", "COMMERCIAL-LICENSE.md"]) {
    copyFileSync(join(repositoryRoot, fileName), join(packageDirectory, fileName));
  }
};

/**
 * Reads a target package name.
 * @param packageDirectory - Target package directory.
 * @returns Target npm package name.
 */
const readPackageName = (packageDirectory: string): string => {
  const packageJson = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")) as {
    name: string;
  };
  return packageJson.name;
};

/**
 * Calculates a file SHA-256 digest.
 * @param filePath - File to hash.
 * @returns Lowercase hexadecimal digest.
 */
const sha256File = (filePath: string): string =>
  createHash("sha256").update(readFileSync(filePath)).digest("hex");

/**
 * Parses named command-line options.
 * @param argumentsToParse - Command-line arguments after the script name.
 * @returns Named argument values.
 */
const parseNamedArguments = (argumentsToParse: string[]): Record<string, string> => {
  const namedArguments: Record<string, string> = {};

  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const argument = argumentsToParse[index];
    if (argument.startsWith("--") && argumentsToParse[index + 1]) {
      namedArguments[argument.slice(2)] = argumentsToParse[index + 1];
    }
  }

  return namedArguments;
};

if (process.argv[1] && resolve(process.argv[1]) === CURRENT_FILE) {
  try {
    const argumentsByName = parseNamedArguments(process.argv.slice(2));
    importRelease({
      source: resolve(argumentsByName.source ?? ""),
      sourceCommit: argumentsByName["source-commit"] ?? "",
      version: argumentsByName.version ?? "",
    });
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export default importRelease;
