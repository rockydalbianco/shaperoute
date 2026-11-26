// TASK-517 part B: two nil guards in react-native-watch-connectivity's iPhone
// code, written into node_modules after every install (the root package.json
// runs this from `postinstall`; no patch-package, which would be a new
// dependency).
//
// The crash: when a `transferUserInfo` fails, the library builds the event
// with `@{@"userInfo": [userInfoTransfer userInfo], ...}`. With `userInfo`
// nil that literal throws an Objective-C exception and the app closes
// (SIGABRT in `-[__NSPlaceholderDictionary initWithObjects:forKeys:count:]`,
// the .ips files of 2026-11-24). The JS part of TASK-517 (#1568) stops the
// transfers without a watch app; this covers a transfer that fails with the
// app installed. A received file that fails to copy builds its event with
// `error.userInfo` the same way, and gets the same guard. The error itself
// needs none: both are inside `if (error)`.
//
// The script only runs where the library is installed: elsewhere it says so
// and exits 0. Where it is installed it must be version 2.0.0 and have either
// the original lines or the patched ones; anything else stops the install
// with exit 1, so a new version of the library is looked at instead of
// silently losing the patch. A second run changes nothing.
//
// It changes the iPhone fingerprint (the library is linked on iOS only,
// react-native.config.js): it comes with a native build.

/* global __dirname */

const fs = require("fs");
const path = require("path");

const PACKAGE = "react-native-watch-connectivity";
const VERSION = "2.0.0";
const SOURCE = path.join("ios", "WatchConnectivity.mm");

/** Each line as the library has it, and as it is after the patch. */
const PATCHES = [
  {
    original: '@"userInfo": [userInfoTransfer userInfo], @"error"',
    patched: '@"userInfo": [userInfoTransfer userInfo] ?: @{}, @"error"',
  },
  {
    original: '@"errorUserInfo": error.userInfo}',
    patched: '@"errorUserInfo": error.userInfo ?: @{}}',
  },
];

/** How many times `part` is in `text`. */
function count(text, part) {
  return text.split(part).length - 1;
}

/**
 * `source` with every patch applied. Throws when a line is neither there
 * once as the library has it nor once already patched.
 * @param {string} source
 * @returns {{ source: string, changed: boolean }}
 */
function patchSource(source) {
  let result = source;
  let changed = false;
  for (const { original, patched } of PATCHES) {
    const originals = count(result, original);
    const patchedOnes = count(result, patched);
    if (originals === 1 && patchedOnes === 0) {
      result = result.replace(original, patched);
      changed = true;
    } else if (originals !== 0 || patchedOnes !== 1) {
      throw new Error(
        `${PACKAGE}: ${SOURCE} does not have \`${original}\` once ` +
          `(found ${originals}, patched ${patchedOnes}). ` +
          "The library changed: look at TASK-517 part B before installing.",
      );
    }
  }
  return { source: result, changed };
}

/**
 * Patches the library in `packageDir`. Throws when its version or its lines
 * are not the expected ones.
 * @param {string} packageDir
 * @returns {boolean} whether the file was written
 */
function patchPackage(packageDir) {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
  );
  if (version !== VERSION) {
    throw new Error(
      `${PACKAGE} is ${version}, the patch is for ${VERSION}: ` +
        "look at TASK-517 part B before installing.",
    );
  }
  const file = path.join(packageDir, SOURCE);
  const { source, changed } = patchSource(fs.readFileSync(file, "utf8"));
  if (changed) {
    fs.writeFileSync(file, source);
  }
  return changed;
}

/** The library's folder as the app resolves it, or null when not installed. */
function findPackage() {
  try {
    const manifest = require.resolve(`${PACKAGE}/package.json`, {
      paths: [path.join(__dirname, "..")],
    });
    return path.dirname(manifest);
  } catch {
    return null;
  }
}

function main() {
  const packageDir = findPackage();
  if (packageDir === null) {
    console.log(`${PACKAGE} is not installed: nothing to patch.`);
    return 0;
  }
  try {
    const changed = patchPackage(packageDir);
    console.log(
      changed
        ? `${PACKAGE}: nil guards written into ${SOURCE}.`
        : `${PACKAGE}: ${SOURCE} already has the nil guards.`,
    );
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { PATCHES, VERSION, patchSource, patchPackage, findPackage };
