import Foundation

/// A point as the project keeps it: latitude, then longitude, WGS84.
public struct LatLon: Equatable, Sendable {
    public var lat: Double
    public var lon: Double

    public init(_ lat: Double, _ lon: Double) {
        self.lat = lat
        self.lon = lon
    }
}

/// Where the runner is along the route, from a GPS fix (TASK-370 part B1):
/// the phone's src/navigation/progress.ts, line for line, with the same
/// numbers. The watch's guide traces (Fixtures/guide/) keep the two alike.
///
/// A shape crosses itself and passes the same street twice, so the fix is
/// placed only near where the runner last was: from `backM` behind to
/// `aheadM` ahead. Going ahead costs a little (`forwardCost`), going back
/// as much as being off the route; among the places within `offRouteM` the
/// cheapest wins, off it the nearest.
public enum RouteProgress {
    public static let backM = 50.0
    public static let aheadM = 300.0
    /// What a metre ahead along the route costs, against a metre off it.
    public static let forwardCost = 0.25
    /// Farther than this from the route, a fix is off it.
    public static let offRouteM = 40.0

    public struct Located: Equatable, Sendable {
        /// Metres along the route to the point nearest to the fix.
        public var alongM: Double
        /// Metres from the fix to the route.
        public var offM: Double
    }

    static let earthRadiusM = 6_371_000.0
    static let rad = Double.pi / 180

    /// Great-circle distance in metres, as the route engine measures it
    /// (src/map/coordinates.ts).
    public static func metresBetween(_ a: LatLon, _ b: LatLon) -> Double {
        let dLat = (b.lat - a.lat) * rad
        let dLon = (b.lon - a.lon) * rad
        let s = pow(sin(dLat / 2), 2)
            + cos(a.lat * rad) * cos(b.lat * rad) * pow(sin(dLon / 2), 2)
        return 2 * earthRadiusM * asin(s.squareRoot())
    }

    /// Metres along the route at each of its points.
    public static func cumulative(_ points: [LatLon]) -> [Double] {
        var along = [0.0]
        for i in points.indices.dropFirst() {
            along.append(along[i - 1] + metresBetween(points[i - 1], points[i]))
        }
        return along
    }

    /// The fix placed on the route near `fromM`, up to `aheadM` ahead.
    public static func locate(
        _ points: [LatLon], _ along: [Double], _ fix: LatLon, fromM: Double,
        aheadM: Double = aheadM
    ) -> Located {
        var onRoute: Located?
        var onRouteCost = Double.infinity
        var nearest = Located(alongM: fromM, offM: .infinity)
        for i in points.indices.dropFirst() {
            if along[i] < fromM - backM {
                continue
            }
            if along[i - 1] > fromM + aheadM {
                break
            }
            let here = onSegment(points, along, fix, i)
            if here.offM < nearest.offM {
                nearest = here
            }
            if here.offM > offRouteM {
                continue
            }
            let cost = here.offM + max(0, fromM - here.alongM)
                + forwardCost * max(0, here.alongM - fromM)
            if cost < onRouteCost {
                onRoute = here
                onRouteCost = cost
            }
        }
        return onRoute ?? nearest
    }

    /// The point of the route nearest to the fix, between `fromM` and `toM`
    /// metres along it.
    public static func nearest(
        _ points: [LatLon], _ along: [Double], _ fix: LatLon,
        fromM: Double = -.infinity, toM: Double = .infinity
    ) -> Located {
        var best = Located(alongM: 0, offM: .infinity)
        for i in points.indices.dropFirst() {
            if along[i] < fromM {
                continue
            }
            if along[i - 1] > toM {
                break
            }
            let here = onSegment(points, along, fix, i)
            if here.offM < best.offM {
                best = here
            }
        }
        return best
    }

    /// The point of the segment ending at point `i` nearest to the fix, on
    /// the plane tangent at the fix: segments are short.
    static func onSegment(
        _ points: [LatLon], _ along: [Double], _ fix: LatLon, _ i: Int
    ) -> Located {
        let (ax, ay) = toPlane(fix, points[i - 1])
        let (bx, by) = toPlane(fix, points[i])
        let dx = bx - ax
        let dy = by - ay
        let length2 = dx * dx + dy * dy
        let t = length2 > 0 ? min(1, max(0, -(ax * dx + ay * dy) / length2)) : 0
        return Located(
            alongM: along[i - 1] + t * (along[i] - along[i - 1]),
            offM: hypot(ax + t * dx, ay + t * dy)
        )
    }

    static func toPlane(_ origin: LatLon, _ point: LatLon) -> (Double, Double) {
        (
            (point.lon - origin.lon) * rad * earthRadiusM * cos(origin.lat * rad),
            (point.lat - origin.lat) * rad * earthRadiusM
        )
    }
}
