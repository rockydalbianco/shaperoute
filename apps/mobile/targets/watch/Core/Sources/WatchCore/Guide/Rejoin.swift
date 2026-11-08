import Foundation

/// Where a runner off the route gets back on it (TASK-370 part B1): the
/// phone's src/navigation/rejoin.ts. The point of the route nearest in a
/// straight line, ahead of where they left it, looked for `aheadM` on and
/// `perM` more for each metre run off it: a detour round a block skips less
/// of the route than it runs, a later part of the shape is too far on.
public struct Rejoin: Equatable, Sendable {
    public static let perM = 2.0

    /// The fix it is seen from: where the runner is.
    public var from: LatLon
    /// The point of the route to get back to.
    public var to: LatLon
    /// Metres along the route to it.
    public var alongM: Double
    /// Metres to it in a straight line.
    public var distanceM: Double
    /// Which way, in degrees clockwise from north.
    public var bearingDeg: Double

    /// How far along the route from where the runner left it they are
    /// looked for, after `offRunM` metres run off it.
    public static func aheadM(offRunM: Double) -> Double {
        RouteProgress.aheadM + perM * offRunM
    }

    /// The point of the route between `fromM` and `toM` nearest to `fix`;
    /// nil when the route has no stretch there.
    public static func of(
        _ points: [LatLon], _ along: [Double], _ fix: LatLon, fromM: Double, toM: Double
    ) -> Rejoin? {
        let near = RouteProgress.nearest(points, along, fix, fromM: fromM, toM: toM)
        guard near.offM.isFinite else {
            return nil
        }
        // `nearest` takes the whole of the segments at either end: no further.
        let alongM = min(max(near.alongM, fromM), toM)
        let to = pointAt(points, along, alongM)
        return Rejoin(
            from: fix,
            to: to,
            alongM: alongM,
            distanceM: RouteProgress.metresBetween(fix, to),
            bearingDeg: bearing(from: fix, to: to)
        )
    }

    /// The point `alongM` metres along the route.
    static func pointAt(_ points: [LatLon], _ along: [Double], _ alongM: Double) -> LatLon {
        for i in points.indices.dropFirst() where along[i] >= alongM {
            let length = along[i] - along[i - 1]
            let t = length > 0 ? (alongM - along[i - 1]) / length : 0
            let a = points[i - 1]
            let b = points[i]
            return LatLon(a.lat + t * (b.lat - a.lat), a.lon + t * (b.lon - a.lon))
        }
        return points[points.count - 1]
    }

    /// Degrees clockwise from north of the way from `from` to `to`, on the
    /// plane tangent at `from`: the way is short.
    static func bearing(from: LatLon, to: LatLon) -> Double {
        let east = (to.lon - from.lon) * cos(from.lat * Double.pi / 180)
        let north = to.lat - from.lat
        return (atan2(east, north) * 180 / Double.pi + 360).truncatingRemainder(dividingBy: 360)
    }
}
