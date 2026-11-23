// Links WatchCore, the pure Swift package of the Apple Watch app
// (targets/watch/Core, TASK-370 parts A1 and A2), to the watch's target as
// a local Swift package. @bacons/apple-targets puts the whole
// targets/watch/ folder in the target, so without this Core's
// Package.swift, its tests and its `.build` would be compiled into the app,
// and WatchCore's Bundle.module (sports.json) would not exist.
//
// Used only through src/watch/watchConfig.ts, with MUW_WATCH=1 for now and
// from the watch's own build (1.1, part A-flip). It must come before
// @bacons/apple-targets in the plugins: Expo runs the Xcode changes in
// reverse order, so this runs after the target is made.

const path = require("path");

/** The folder of the watch's target, as @bacons/apple-targets names its group. */
const WATCH_DIR = "watch";
/** The package's folder inside it, kept out of the target's own files, and
 * the folder's .gitignore, which is not for the app either. */
const CORE_DIR = "Core";
const LEFT_OUT = [CORE_DIR, ".gitignore"];
const PRODUCT = "WatchCore";

/** A module of @bacons/apple-targets, or one of its own dependencies. */
function fromAppleTargets(name) {
  const root = path.dirname(require.resolve("@bacons/apple-targets/package.json"));
  return require(require.resolve(name, { paths: [root] }));
}

/** The watch's target and the folder group @bacons/apple-targets gave it. */
function watchTarget(project) {
  for (const target of project.rootObject.props.targets) {
    const group = (target.props.fileSystemSynchronizedGroups || []).find(
      (each) => each.props.path === WATCH_DIR,
    );
    if (group) {
      return { target, group };
    }
  }
  throw new Error(
    `[withWatchCore] No target for targets/${WATCH_DIR}: @bacons/apple-targets must come after this plugin and match "${WATCH_DIR}".`,
  );
}

function linkWatchCore(project, xcode) {
  const { target, group } = watchTarget(project);

  // Core/ out of the target's files: the package brings its sources.
  const exceptions = group.props.exceptions.find(
    (each) =>
      xcode.PBXFileSystemSynchronizedBuildFileExceptionSet.is(each) &&
      each.props.target === target,
  );
  if (!exceptions) {
    throw new Error("[withWatchCore] The watch's folder has no exception set.");
  }
  const kept = exceptions.props.membershipExceptions || [];
  exceptions.props.membershipExceptions = [
    ...kept,
    ...LEFT_OUT.filter((name) => !kept.includes(name)),
  ].sort();

  // The package, relative to ios/ as the folder group is.
  const relativePath = `../targets/${WATCH_DIR}/${CORE_DIR}`;
  const root = project.rootObject;
  root.props.packageReferences = root.props.packageReferences || [];
  let reference = root.props.packageReferences.find(
    (each) =>
      xcode.XCLocalSwiftPackageReference.is(each) &&
      each.props.relativePath === relativePath,
  );
  if (!reference) {
    reference = xcode.XCLocalSwiftPackageReference.create(project, { relativePath });
    root.props.packageReferences.push(reference);
  }

  // Its library, linked to the watch's app.
  target.props.packageProductDependencies =
    target.props.packageProductDependencies || [];
  if (
    !target.props.packageProductDependencies.some(
      (each) => each.props.productName === PRODUCT,
    )
  ) {
    const product = xcode.XCSwiftPackageProductDependency.create(project, {
      package: reference,
      productName: PRODUCT,
    });
    target.props.packageProductDependencies.push(product);
    target
      .getFrameworksBuildPhase()
      .props.files.push(xcode.PBXBuildFile.create(project, { productRef: product }));
  }
}

module.exports = function withWatchCore(config) {
  const { withXcodeProjectBeta } = fromAppleTargets(
    "@bacons/apple-targets/build/with-bacons-xcode",
  );
  return withXcodeProjectBeta(config, (config) => {
    linkWatchCore(config.modResults, fromAppleTargets("@bacons/xcode"));
    return config;
  });
};
