// Imports
// -----------------------------------------------------------------------------
// NodeJS
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Internal
import { RELEASE_TARGETS, WASI_RELEASE_TARGET } from "../scripts/release-targets.ts";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Reads a package manifest from the binary workspace.
 * @param filePath - Absolute package manifest path.
 * @returns Parsed package manifest.
 */
const readPackageJson = (filePath: string): Record<string, unknown> =>
  JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;

test("Expect target packages to declare one matching npm platform", () => {
  const rootPackageJson = readPackageJson(join(REPOSITORY_ROOT, "package.json"));
  const versions = new Set<string>();

  assert.match(String(rootPackageJson.version), /^\d+\.\d+\.\d+$/);

  for (const target of RELEASE_TARGETS) {
    const packageJson = readPackageJson(
      join(REPOSITORY_ROOT, "packages", target.packageDirectory, "package.json"),
    );
    const packageReadme = readFileSync(
      join(REPOSITORY_ROOT, "packages", target.packageDirectory, "README.md"),
      "utf8",
    );
    const packageBin = packageJson.bin as { wfc: string };
    const packageRepository = packageJson.repository as { directory: string; url: string };

    assert.deepEqual(packageJson.os, [target.platform]);
    assert.deepEqual(packageJson.cpu, [target.architecture]);
    assert.equal(packageJson.name, `@vx.rs/webfont-converter-bin-${target.packageDirectory}`);
    assert.equal(packageBin.wfc, `./bin/${target.executable}`);
    assert.match(String(packageJson.version), /^\d+\.\d+\.\d+$/);
    versions.add(String(packageJson.version));
    assert.equal(packageJson.license, "PolyForm-Noncommercial-1.0.0");
    assert.equal((packageJson.files as string[]).includes("bin/"), true);
    assert.equal(
      packageRepository.url,
      "git+https://github.com/vx-rs/webfont-converter-binaries.git",
    );
    assert.equal(packageRepository.directory, `packages/${target.packageDirectory}`);
    assert.equal(packageReadme.includes(`built for \`${target.packageDirectory}\``), true);
    assert.match(packageReadme, /consumed by `@vx\.rs\/webfont-converter`/);
    assert.deepEqual(packageJson.publishConfig, {
      access: "public",
      registry: "https://registry.npmjs.org",
    });
  }

  assert.equal(versions.size, 1);
  assert.equal(versions.has(String(rootPackageJson.version)), true);
});

test("Expect the WASI package to be platform independent", () => {
  const packageJson = readPackageJson(
    join(REPOSITORY_ROOT, "packages", WASI_RELEASE_TARGET.packageDirectory, "package.json"),
  );
  const packageReadme = readFileSync(
    join(REPOSITORY_ROOT, "packages", WASI_RELEASE_TARGET.packageDirectory, "README.md"),
    "utf8",
  );

  assert.equal(packageJson.name, "@vx.rs/webfont-converter-wasi");
  assert.equal(packageJson.version, "1.0.0");
  assert.equal(packageJson.os, undefined);
  assert.equal(packageJson.cpu, undefined);
  assert.equal((packageJson.files as string[]).includes("wfc.wasm"), true);
  assert.match(packageReadme, /only when\nno compatible native binary can run/);
  assert.match(packageReadme, /slower than a native/);
});
