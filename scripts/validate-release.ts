// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Internal
import { RELEASE_TARGETS, WASI_RELEASE_TARGET } from "./release-targets.ts";

// Types
// -----------------------------------------------------------------------------
type ReleaseManifestTarget = {
  executable: string;
  package: string;
  sha256: string;
  target: string;
};

type ReleaseManifest = {
  targets: ReleaseManifestTarget[];
  version: string;
};

const CURRENT_FILE = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(CURRENT_FILE), "..");

/**
 * Validates that public target packages exactly match one release manifest.
 * @param options - Validation inputs.
 * @returns Nothing.
 * @throws When package files, versions, or hashes do not match.
 */
export const validateRelease = ({
  repositoryRoot,
  version,
}: {
  repositoryRoot: string;
  version: string;
}): void => {
  if (!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(version)) {
    throw new Error(
      `Release version must be stable X.Y.Z without leading zeroes, received: ${version}`,
    );
  }

  const manifest = JSON.parse(
    readFileSync(join(repositoryRoot, "release-manifest.json"), "utf8"),
  ) as ReleaseManifest;
  const rootPackageJson = JSON.parse(
    readFileSync(join(repositoryRoot, "package.json"), "utf8"),
  ) as {
    version: string;
  };

  if (
    rootPackageJson.version !== version ||
    manifest.version !== version ||
    manifest.targets.length !== RELEASE_TARGETS.length + 1
  ) {
    throw new Error(`Release manifest does not describe version ${version}`);
  }

  for (const target of RELEASE_TARGETS) {
    const packageDirectory = join(repositoryRoot, "packages", target.packageDirectory);
    const packageJson = JSON.parse(
      readFileSync(join(packageDirectory, "package.json"), "utf8"),
    ) as {
      name: string;
      version: string;
    };
    const binaryPath = join(packageDirectory, "bin", target.executable);
    const manifestTarget = manifest.targets.find(
      (entry) => entry.target === target.packageDirectory,
    );

    if (
      !manifestTarget ||
      manifestTarget.package !== packageJson.name ||
      manifestTarget.executable !== `bin/${target.executable}` ||
      packageJson.version !== version ||
      !existsSync(binaryPath)
    ) {
      throw new Error(`Invalid package release for ${target.packageDirectory}`);
    }
    if (sha256File(binaryPath) !== manifestTarget.sha256) {
      throw new Error(`Checksum mismatch for ${target.packageDirectory}`);
    }
    for (const fileName of [
      "LICENSE",
      "NOTICE",
      "COMMERCIAL-LICENSE.md",
      "README.md",
      "SHA256SUMS",
    ]) {
      if (!existsSync(join(packageDirectory, fileName))) {
        throw new Error(`Missing ${fileName} in ${target.packageDirectory}`);
      }
    }
  }
  validateWasiPackage(repositoryRoot, version, manifest);
};

/**
 * Validates the platform-independent WASI compatibility fallback package.
 * @param repositoryRoot - Public binary repository root.
 * @param version - Expected stable release version.
 * @param manifest - Parsed release manifest.
 * @returns Nothing.
 * @throws When the WASI package does not match the release manifest.
 */
const validateWasiPackage = (
  repositoryRoot: string,
  version: string,
  manifest: ReleaseManifest,
): void => {
  const packageDirectory = join(repositoryRoot, "packages", WASI_RELEASE_TARGET.packageDirectory);
  const packageJson = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")) as {
    name: string;
    version: string;
  };
  const modulePath = join(packageDirectory, WASI_RELEASE_TARGET.executable);
  const manifestTarget = manifest.targets.find(
    (entry) => entry.target === WASI_RELEASE_TARGET.packageDirectory,
  );

  if (
    !manifestTarget ||
    manifestTarget.package !== packageJson.name ||
    manifestTarget.executable !== WASI_RELEASE_TARGET.executable ||
    packageJson.version !== version ||
    !existsSync(modulePath) ||
    sha256File(modulePath) !== manifestTarget.sha256
  ) {
    throw new Error("Invalid package release for wasi");
  }
  for (const fileName of [
    "LICENSE",
    "NOTICE",
    "COMMERCIAL-LICENSE.md",
    "README.md",
    "SHA256SUMS",
  ]) {
    if (!existsSync(join(packageDirectory, fileName))) {
      throw new Error(`Missing ${fileName} in wasi`);
    }
  }
};

/**
 * Calculates a file SHA-256 digest.
 * @param filePath - File to hash.
 * @returns Lowercase hexadecimal digest.
 */
const sha256File = (filePath: string): string =>
  createHash("sha256").update(readFileSync(filePath)).digest("hex");

if (process.argv[1] && resolve(process.argv[1]) === CURRENT_FILE) {
  try {
    validateRelease({ repositoryRoot: REPOSITORY_ROOT, version: process.argv[2] ?? "" });
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export default validateRelease;
