import Foundation

/// The line of the workout so far, for the map of a run without a route
/// (TASK-370 part B5): a point every `stepM` at least, so that standing
/// still adds nothing, and never more than `maxPoints`, so that the map
/// stays light on the wrist. Past that it keeps one point every two, the
/// first and the last always: a long run is drawn as finely as fits.
public struct LiveLine: Equatable, Sendable {
    public static let stepM = 5.0
    public static let maxPoints = 1500

    public private(set) var points: [LatLon] = []

    public init() {}

    public mutating func add(_ point: LatLon) {
        if let last = points.last, RouteProgress.metresBetween(last, point) < Self.stepM {
            return
        }
        points.append(point)
        if points.count > Self.maxPoints {
            let last = points[points.count - 1]
            points = stride(from: 0, to: points.count - 1, by: 2).map { points[$0] } + [last]
        }
    }
}
