// swift-tools-version:5.9
// The core of the Apple Watch app (TASK-370 part A1, ADR-0314): pure Swift,
// no HealthKit, no WatchConnectivity, no screen. It runs with `swift test`
// on any Mac, with no Xcode project and no prebuild; the watch app of part
// A2 links it.

import PackageDescription

let package = Package(
    name: "WatchCore",
    platforms: [.watchOS(.v10), .iOS(.v17), .macOS(.v13)],
    products: [
        .library(name: "WatchCore", targets: ["WatchCore"]),
    ],
    targets: [
        .target(
            name: "WatchCore",
            resources: [.copy("Resources/sports.json")]
        ),
        .testTarget(
            name: "WatchCoreTests",
            dependencies: ["WatchCore"]
        ),
    ]
)
