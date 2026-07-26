// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

// Internal
import { RELEASE_TARGETS, WASI_RELEASE_TARGET } from "./release-targets.ts";

// Types
// -----------------------------------------------------------------------------
type PackageJson = Record<string, unknown> & {
  name: string;
  version: string;
};

type PackageLockJson = PackageJson & {
  packages?: Record<string, PackageJson>;
};

const CURRENT_FILE = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(CURRENT_FILE), "..");
const BUMP_TYPES = ["major", "minor", "patch"] as const;
const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

/**
 * Reads one JSON file.
 * @param filePath - Absolute JSON file path.
 * @returns Parsed JSON object.
 * @throws When the file cannot be parsed as JSON.
 */
const readJsonFile = (filePath: string): PackageJson =>
  JSON.parse(readFileSync(filePath, "utf8")) as PackageJson;

/**
 * Writes one JSON file with repository-standard formatting.
 * @param filePath - Absolute JSON file path.
 * @param data - JSON data to write.
 * @returns Nothing.
 */
const writeJsonFile = (filePath: string, data: PackageJson): void => {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

/**
 * Synchronizes the root package-lock metadata when a lockfile is present.
 * @param repositoryRoot - Binary repository root.
 * @param packageName - Root package name.
 * @param version - Exact release version.
 * @returns Nothing.
 */
const updatePackageLock = (repositoryRoot: string, packageName: string, version: string): void => {
  const packageLockPath = join(repositoryRoot, "package-lock.json");

  if (!existsSync(packageLockPath)) return;

  const packageLock = readJsonFile(packageLockPath) as PackageLockJson;
  packageLock.name = packageName;
  packageLock.version = version;

  if (packageLock.packages?.[""]) {
    packageLock.packages[""].name = packageName;
    packageLock.packages[""].version = version;
  }

  writeJsonFile(packageLockPath, packageLock);
};

/**
 * Validates a plain semantic version.
 * @param version - Version string to validate.
 * @returns Validated version string.
 * @throws When the version is not a stable X.Y.Z version without leading zeroes.
 */
export const validateVersion = (version: string): string => {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(
      `Invalid version "${version}". Expected stable format: X.Y.Z without leading zeroes`,
    );
  }

  return version;
};

/**
 * Bumps a semantic version by one requested component.
 * @param currentVersion - Current semantic version.
 * @param bumpType - Version component to bump.
 * @returns Next semantic version.
 * @throws When the version or bump type is invalid.
 */
export const bumpVersion = (
  currentVersion: string,
  bumpType: (typeof BUMP_TYPES)[number],
): string => {
  validateVersion(currentVersion);

  if (!BUMP_TYPES.includes(bumpType)) {
    throw new Error(`Invalid bump type "${bumpType}". Expected: ${BUMP_TYPES.join(", ")}`);
  }

  const [major, minor, patch] = currentVersion.split(".").map(Number);

  if (bumpType === "major") return `${major + 1}.0.0`;
  if (bumpType === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

/**
 * Resolves an exact semantic version or a bump type.
 * @param currentVersion - Current semantic version.
 * @param versionArgument - Exact version or bump type.
 * @returns Resolved next version.
 * @throws When the argument is invalid.
 */
export const resolveNextVersion = (currentVersion: string, versionArgument: string): string =>
  BUMP_TYPES.includes(versionArgument as (typeof BUMP_TYPES)[number])
    ? bumpVersion(currentVersion, versionArgument as (typeof BUMP_TYPES)[number])
    : validateVersion(versionArgument);

/**
 * Updates the private workspace and every public native or WASI package version.
 * @param repositoryRoot - Binary repository root.
 * @param nextVersion - Exact next version.
 * @returns Update summary.
 * @throws When one package manifest is invalid or missing.
 */
export const updatePackageVersion = (
  repositoryRoot: string,
  nextVersion: string,
): { currentVersion: string; nextVersion: string; packageName: string } => {
  const rootPackagePath = join(repositoryRoot, "package.json");
  const rootPackageJson = readJsonFile(rootPackagePath);
  const currentVersion = validateVersion(rootPackageJson.version);
  const validatedNextVersion = validateVersion(nextVersion);

  rootPackageJson.version = validatedNextVersion;
  writeJsonFile(rootPackagePath, rootPackageJson);
  updatePackageLock(repositoryRoot, rootPackageJson.name, validatedNextVersion);

  for (const target of RELEASE_TARGETS) {
    const packagePath = join(repositoryRoot, "packages", target.packageDirectory, "package.json");
    const packageJson = readJsonFile(packagePath);
    packageJson.version = validatedNextVersion;
    writeJsonFile(packagePath, packageJson);
  }
  const wasiPackagePath = join(
    repositoryRoot,
    "packages",
    WASI_RELEASE_TARGET.packageDirectory,
    "package.json",
  );
  const wasiPackageJson = readJsonFile(wasiPackagePath);
  wasiPackageJson.version = validatedNextVersion;
  writeJsonFile(wasiPackagePath, wasiPackageJson);

  return {
    currentVersion,
    nextVersion: validatedNextVersion,
    packageName: rootPackageJson.name,
  };
};

/**
 * Prompts for a version argument when no argument is passed.
 * @param currentVersion - Current semantic version.
 * @returns Entered version argument.
 */
const promptVersionArgument = async (currentVersion: string): Promise<string> => {
  const input = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return (
      await input.question(`Next version for ${currentVersion} (major, minor, patch, or X.Y.Z): `)
    ).trim();
  } finally {
    input.close();
  }
};

/**
 * Runs the package version update command.
 * @param args - Command arguments.
 * @param repositoryRoot - Binary repository root.
 * @returns Nothing.
 * @throws When the requested version is invalid.
 */
export const runPackageVersionUpdate = async (
  args = process.argv.slice(2),
  repositoryRoot = REPOSITORY_ROOT,
): Promise<void> => {
  const packageJson = readJsonFile(join(repositoryRoot, "package.json"));
  const currentVersion = validateVersion(packageJson.version);
  const versionArgument = args[0] ?? (await promptVersionArgument(currentVersion));
  const nextVersion = resolveNextVersion(currentVersion, versionArgument);
  const summary = updatePackageVersion(repositoryRoot, nextVersion);

  console.log(
    `Updated ${summary.packageName} from ${summary.currentVersion} to ${summary.nextVersion}`,
  );
  console.log(
    "Updated package.json, package-lock.json, five native packages, and the WASI package",
  );
};

if (process.argv[1] && resolve(process.argv[1]) === CURRENT_FILE) {
  runPackageVersionUpdate().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export default runPackageVersionUpdate;
