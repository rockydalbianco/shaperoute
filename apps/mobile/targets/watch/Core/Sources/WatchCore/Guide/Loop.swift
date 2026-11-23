import Foundation

/// A closed route twice round, so that a fix is followed across the route's
/// start as anywhere else on it. `lengthM` is once round, with the step
/// from the last point to the first when they are not the same.
public struct RouteLoop: Equatable, Sendable {
    public var points: [LatLon]
    public var along: [Double]
    public var lengthM: Double
}

/// A route followed from where a run joined it.
public struct JoinedRoute: Equatable, Sendable {
    public var points: [LatLon]
    public var along: [Double]
    public var directions: [GuideDirection]
    /// Where it was joined, along the route as drawn: 0 at its start.
    public var joinedAtM: Double
}

/// A closed shape starts wherever the runner reaches it (TASK-370 part B2):
/// the phone's src/navigation/startAnywhere.ts, with the same numbers. The
/// run begins where the runner first reaches the shape, goes all the way
/// round and ends back there, with the turns from there. Words and open
/// shapes start at their start. Which routes do is the phone's to say when
/// it sends one (`startsAnywhere`); the watch turns the route at run time.
public enum StartAnywhere {
    /// A route whose end is this close to its start is closed.
    public static let closedM = 25.0
    /// Joined this close to its start, either side, the route is as drawn.
    public static let atStartM = 25.0
    // The engine's own (directions.py), for the turn at the route's start.
    static let headingProbeM = 20.0
    static let turnMinDeg = 30.0
    static let sharpMinDeg = 135.0
    static let uTurnMinDeg = 165.0
    static let minBranches = 3
    /// Directions closer than this to the one before are read with it.
    static let groupM = 15.0

    /// Whether the route ends where it starts.
    public static func isClosed(_ points: [LatLon]) -> Bool {
        guard points.count >= 3, let first = points.first, let last = points.last else {
            return false
        }
        return RouteProgress.metresBetween(first, last) <= closedM
    }

    /// Whether a run along `points` starts wherever it reaches them: a closed
    /// route that is not a word, nor in pieces with the pen up between them.
    public static func startsAnywhere(_ points: [LatLon], word: String?, walks: Int) -> Bool {
        isClosed(points) && (word ?? "").isEmpty && walks == 0
    }

    /// The loop of a closed route whose metres along it are `along`.
    public static func loopOf(_ points: [LatLon], _ along: [Double]) -> RouteLoop {
        let gapM = RouteProgress.metresBetween(points[points.count - 1], points[0])
        let twice = points + (gapM > 0 ? points : Array(points.dropFirst()))
        return RouteLoop(
            points: twice,
            along: RouteProgress.cumulative(twice),
            lengthM: (along.last ?? 0) + gapM
        )
    }

    /// The closed route from `joinM` metres along it round to there again,
    /// with its directions at their distances from there.
    public static func joinRoute(
        _ points: [LatLon], _ along: [Double], _ directions: [GuideDirection],
        _ loop: RouteLoop, joinM: Double
    ) -> JoinedRoute {
        let lengthM = loop.lengthM
        if joinM <= atStartM || lengthM - joinM <= atStartM {
            return JoinedRoute(points: points, along: along, directions: directions, joinedAtM: 0)
        }
        let turned = cut(loop.points, loop.along, fromM: joinM, toM: joinM + lengthM)
        return JoinedRoute(
            points: turned,
            along: RouteProgress.cumulative(turned),
            directions: joinDirections(
                points, along, directions, at: turned[0], joinM: joinM, lengthM: lengthM),
            joinedAtM: joinM
        )
    }

    /// The directions from `joinM` round: heading out on the road the runner
    /// is on there, the ones after first, then the turn at the route's
    /// start, then the ones before; read together GROUP_M apart.
    static func joinDirections(
        _ points: [LatLon], _ along: [Double], _ directions: [GuideDirection],
        at: LatLon, joinM: Double, lengthM: Double
    ) -> [GuideDirection] {
        let depart = directions.first?.turn == "depart" ? directions.first : nil
        let turns = depart == nil ? directions : Array(directions.dropFirst())
        var head: [GuideDirection] = []
        if var onRoad = directions.last(where: { $0.distanceM <= joinM }) {
            onRoad.point = at
            onRoad.distanceM = 0
            onRoad.turn = "depart"
            onRoad.angleDeg = 0
            onRoad.joined = false
            head = [onRoad]
        }
        let ahead = turns.filter { $0.distanceM >= joinM }.map { direction -> GuideDirection in
            var moved = direction
            moved.distanceM = direction.distanceM - joinM
            return moved
        }
        let behind = turns.filter { $0.distanceM < joinM }.map { direction -> GuideDirection in
            var moved = direction
            moved.distanceM = direction.distanceM + lengthM - joinM
            return moved
        }
        var atStart: [GuideDirection] = []
        if let depart, var turn = startTurn(points, along, depart, came: turns.last ?? depart) {
            turn.distanceM = lengthM - joinM
            atStart = [turn]
        }
        var all = head + ahead + atStart + behind
        for i in all.indices.dropFirst() {
            all[i].joined = all[i].distanceM - all[i - 1].distanceM < groupM
        }
        return all
    }

    /// The turn at the start of a closed route, from the road it ends on
    /// onto the road it heads out on, as the engine says one at any other
    /// node: only at a junction, and only when the route turns there or
    /// changes road; nil otherwise.
    static func startTurn(
        _ points: [LatLon], _ along: [Double], _ depart: GuideDirection, came: GuideDirection
    ) -> GuideDirection? {
        let totalM = along.last ?? 0
        if depart.branches < minBranches || totalM < 2 * headingProbeM {
            return nil
        }
        let node = points[0]
        let arrival = bearing(node, pointAt(points, along, totalM - headingProbeM)) + 180
        let angle = signed(bearing(node, pointAt(points, along, headingProbeM)) - arrival)
        let from = namesOf(came.street)
        let onto = namesOf(depart.street)
        let both = onto.filter { from.contains($0) }
        let changed = both.isEmpty && (!from.isEmpty || !onto.isEmpty)
        let turn = turnOf(angle)
        if turn == "straight" && !changed {
            return nil
        }
        var start = depart
        start.turn = turn
        start.angleDeg = angle
        start.street = both.isEmpty ? depart.street : both.sorted().joined(separator: " / ")
        start.joined = false
        return start
    }

    /// The kind of turn for a signed angle, positive to the right.
    static func turnOf(_ angle: Double) -> String {
        let size = abs(angle)
        if size <= turnMinDeg {
            return "straight"
        }
        if size >= uTurnMinDeg {
            return "u-turn"
        }
        if size >= sharpMinDeg {
            return angle > 0 ? "sharp-right" : "sharp-left"
        }
        return angle > 0 ? "right" : "left"
    }

    /// The names of a road as a direction gives them, in order, once each:
    /// "A / B" is two.
    static func namesOf(_ street: String?) -> [String] {
        guard let street, !street.isEmpty else {
            return []
        }
        var names: [String] = []
        for name in street.components(separatedBy: " / ") where !names.contains(name) {
            names.append(name)
        }
        return names
    }

    /// The line of `points` from `fromM` to `toM` metres along it.
    static func cut(_ points: [LatLon], _ along: [Double], fromM: Double, toM: Double) -> [LatLon] {
        var line = [pointAt(points, along, fromM)]
        for i in points.indices where along[i] > fromM && along[i] < toM {
            line.append(points[i])
        }
        line.append(pointAt(points, along, toM))
        return line
    }

    /// The point `m` metres along the line, between two of its points.
    static func pointAt(_ points: [LatLon], _ along: [Double], _ m: Double) -> LatLon {
        var i = 1
        while i < points.count - 1 && along[i] < m {
            i += 1
        }
        let a = points[i - 1]
        let b = points[i]
        let span = along[i] - along[i - 1]
        let t = span > 0 ? min(1, max(0, (m - along[i - 1]) / span)) : 0
        return LatLon(a.lat + t * (b.lat - a.lat), a.lon + t * (b.lon - a.lon))
    }

    /// Compass bearing from `from` to `to`, in [0, 360), on the plane
    /// tangent at `from`.
    static func bearing(_ from: LatLon, _ to: LatLon) -> Double {
        let rad = Double.pi / 180
        let x = (to.lon - from.lon) * cos(from.lat * rad)
        let y = to.lat - from.lat
        return (atan2(x, y) / rad + 360).truncatingRemainder(dividingBy: 360)
    }

    /// An angle in (-180, 180].
    static func signed(_ angle: Double) -> Double {
        let wrapped = (((angle + 180).truncatingRemainder(dividingBy: 360) + 360)
            .truncatingRemainder(dividingBy: 360)) - 180
        return wrapped == -180 ? 180 : wrapped
    }
}

extension RouteProgress {
    /// Each pass of the route within `offRouteM` of the fix, at its point
    /// nearest to it, in their order along the route: a shape passes the
    /// same street twice, and which pass a runner joining it is on shows
    /// only from the way they go (progress.ts `passesNear`).
    public static func passesNear(
        _ points: [LatLon], _ along: [Double], _ fix: LatLon
    ) -> [Located] {
        var passes: [Located] = []
        var within = false
        for i in points.indices.dropFirst() {
            let here = onSegment(points, along, fix, i)
            if here.offM > offRouteM {
                within = false
                continue
            }
            if !within || passes.isEmpty {
                passes.append(here)
                within = true
            } else if here.offM < passes[passes.count - 1].offM {
                passes[passes.count - 1] = here
            }
        }
        return passes
    }
}
