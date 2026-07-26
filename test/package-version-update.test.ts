// Imports
// -----------------------------------------------------------------------------
// NodeJS
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import test from "node:test";

// Internal
import { RELEASE_TARGETS, WASI_RELEASE_TARGET } from "../scripts/release-targets.ts";
import {
  bumpVersion,
  resolveNextVersion,
  updatePackageVersion,
} from "../scripts/package-version-update.ts";

/**
 * Creates a temporary binary workspace manifest fixture.
 * @returns Fixture paths and cleanup function.
 */
const createBinaryFixture = (): { directory: string; remove: () => void } => {
  const directory = mkdtempSync(join(os.tmpdir(), "vx-wfc-binaries-version-"));
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      name: "@vx.rs/webfont-converter-binaries",
      version: "1.0.0",
    }),
  );
  writeFileSync(
    join(directory, "package-lock.json"),
    JSON.stringify({
      name: "@vx.rs/webfont-converter-binaries",
      packages: { "": { name: "@vx.rs/webfont-converter-binaries", version: "1.0.0" } },
      version: "1.0.0",
    }),
  );

  for (const target of RELEASE_TARGETS) {
    const targetDirectory = join(directory, "packages", target.packageDirectory);
    mkdirSync(targetDirectory, { recursive: true });
    writeFileSync(
      join(targetDirectory, "package.json"),
      JSON.stringify({
        name: `@vx.rs/webfont-converter-bin-${target.packageDirectory}`,
        version: "1.0.0",
      }),
    );
  }
  const wasiDirectory = join(directory, "packages", WASI_RELEASE_TARGET.packageDirectory);
  mkdirSync(wasiDirectory, { recursive: true });
  writeFileSync(
    join(wasiDirectory, "package.json"),
    JSON.stringify({ name: "@vx.rs/webfont-converter-wasi", version: "1.0.0" }),
  );

  return {
    directory,
    remove: () => rmSync(directory, { force: true, recursive: true }),
  };
};

test("Expect package version update to resolve exact and incremental versions", () => {
  assert.equal(bumpVersion("1.2.3", "major"), "2.0.0");
  assert.equal(bumpVersion("1.2.3", "minor"), "1.3.0");
  assert.equal(resolveNextVersion("1.2.3", "patch"), "1.2.4");
  assert.equal(resolveNextVersion("1.2.3", "4.5.6"), "4.5.6");
});

test("Expect package version update to reject leading-zero versions", () => {
  assert.throws(
    () => resolveNextVersion("1.2.3", "01.0.0"),
    /Expected stable format: X\.Y\.Z without leading zeroes/,
  );
});

test("Expect package version update to synchronize every target package", () => {
  const fixture = createBinaryFixture();

  try {
    const summary = updatePackageVersion(fixture.directory, "1.0.1");
    const rootPackageJson = JSON.parse(
      readFileSync(join(fixture.directory, "package.json"), "utf8"),
    );
    const packageLock = JSON.parse(
      readFileSync(join(fixture.directory, "package-lock.json"), "utf8"),
    );

    assert.deepEqual(summary, {
      currentVersion: "1.0.0",
      nextVersion: "1.0.1",
      packageName: "@vx.rs/webfont-converter-binaries",
    });
    assert.equal(rootPackageJson.version, "1.0.1");
    assert.equal(packageLock.version, "1.0.1");
    assert.equal(packageLock.packages[""].version, "1.0.1");

    for (const target of RELEASE_TARGETS) {
      const targetPackageJson = JSON.parse(
        readFileSync(
          join(fixture.directory, "packages", target.packageDirectory, "package.json"),
          "utf8",
        ),
      );
      assert.equal(targetPackageJson.version, "1.0.1");
    }
    const wasiPackageJson = JSON.parse(
      readFileSync(
        join(fixture.directory, "packages", WASI_RELEASE_TARGET.packageDirectory, "package.json"),
        "utf8",
      ),
    );
    assert.equal(wasiPackageJson.version, "1.0.1");
  } finally {
    fixture.remove();
  }
});
