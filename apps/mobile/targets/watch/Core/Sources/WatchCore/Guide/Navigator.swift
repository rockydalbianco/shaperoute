import Foundation

/// What to do at one junction of the route, as much of the phone's
/// `Direction` as the watch needs to follow it.
public struct GuideDirection: Equatable, Sendable {
    /// Along the route from its start, in metres.
    public var distanceM: Double
    /// "depart" for the first: the road the route starts on.
    public var turn: String
    /// The turn in degrees, positive to the right.
    public var angleDeg: Double
    /// Less than GROUP_M after the direction before: shown with it.
    public var joined: Bool
    /// Name or ref of the road entered; nil when OSM has neither.
    public var street: String?
    /// Roads that meet at the junction.
    public var branches: Int
    /// Where the junction is; nil when the phone did not send it.
    public var point: LatLon?

    public init(
        distanceM: Double, turn: String, angleDeg: Double, joined: Bool, street: String?,
        branches: Int = 0, point: LatLon? = nil
    ) {
        self.distanceM = distanceM
        self.turn = turn
        self.angleDeg = angleDeg
        self.joined = joined
        self.street = street
        self.branches = branches
        self.point = point
    }
}

/// What the guidance tells the runner after a fix: the phone says words,
/// the watch shows and vibrates, so a cue is what is told, not how.
public enum GuideCue: Equatable, Sendable {
    /// The road the route starts on: the direction at `index`.
    case depart(index: Int)
    /// A turn coming: the direction at `index` and the `count - 1` joined
    /// to it, the first `aheadM` metres on.
    case turn(index: Int, count: Int, aheadM: Double)
    case offRoute
    /// Where the route is, from a runner off it.
    case routeAt(distanceM: Double, bearingDeg: Double)
    case backOnRoute
    case arrived
    /// The end of a letter or part of a route in pieces: the pen up until
    /// `letter`, the next one (nil when the route names none).
    case penUp(letter: String?)
    /// The start of the next letter or part.
    case penDown(letter: String?)

    /// Whether the phone vibrates for it: a turn, leaving the route,
    /// arriving and the pen; the others are said only.
    public var vibrates: Bool {
        switch self {
        case .turn, .offRoute, .arrived, .penUp, .penDown:
            return true
        case .depart, .routeAt, .backOnRoute:
            return false
        }
    }
}

/// What the GPS says about a fix besides where it is.
public struct GuideReading: Equatable, Sendable {
    /// Radius of the fix's error, in metres, when given.
    public var accuracyM: Double?
    /// When the fix was taken, in milliseconds.
    public var timeMs: Double?

    public init(accuracyM: Double? = nil, timeMs: Double? = nil) {
        self.accuracyM = accuracyM
        self.timeMs = timeMs
    }
}

/// The guidance along a route (TASK-370 parts B1 and B2, ADR-0314): the
/// phone's src/navigation/navigator.ts, with the same constants and the
/// same steps, from the route's start or, on a closed route, from wherever
/// the runner reaches it (TASK-273, `StartAnywhere`).
public struct Navigation: Equatable, Sendable {
    /// Fixes in a row beyond `offRouteM`, not yet told.
    public struct OffStreak: Equatable, Sendable {
        public var fixes: Int
        public var sinceMs: Double?
    }

    /// After a gap, or off the route, where on the route ahead the fixes
    /// were placed, the first and the last, and how many in a row.
    public struct Found: Equatable, Sendable {
        public var firstM: Double
        public var alongM: Double
        public var fixes: Int
    }

    /// Before a run joins a closed route, the fixes in a row on one pass of
    /// it: where the first and the last were placed, along its loop.
    public struct Pass: Equatable, Sendable {
        public var firstM: Double
        public var lastM: Double
        public var fixes: Int
    }

    public var points: [LatLon]
    public var along: [Double]
    public var directions: [GuideDirection]
    /// Metres along the route to the last fix placed on it.
    public var alongM = 0.0
    /// The next direction to follow; directions.count when none is left.
    public var next = 0
    /// Directions up to this index have been told.
    public var saidUpTo = -1
    public var offRoute = false
    public var offStreak: OffStreak?
    /// Fixes on the route in a row while off it.
    public var backFixes = 0
    /// Fixes in a row at the end of the route.
    public var endFixes = 0
    public var lastFixMs: Double?
    /// A gap was seen and the runner is not placed on the route since.
    public var lost = false
    public var found: Found?
    /// Off the route: where the runner gets back on it, from the last fix.
    public var rejoin: Rejoin?
    /// Off the route, the metres run since it was left.
    public var offRunM = 0.0
    public var arrived = false
    /// How far ahead a turn is told.
    public var announceM: Double
    /// A closed route the run joins wherever it reaches it: the route twice
    /// round, until the run joins it; nil after, and along any other route.
    public var loop: RouteLoop?
    /// Fixes on the route in a row before the run joins it, on each pass.
    public var joining: [Pass]?
    /// Where the run joined a closed route, along the route as drawn:
    /// `points`, `along` and `directions` are then the route from there.
    /// nil before it joins, and along any other route.
    public var joinedAtM: Double?

    /// Whether the run is still to join a closed route.
    public var waitingToJoin: Bool { loop != nil }
}

public enum Navigator {
    /// A turn is told this far ahead: about 15 s at a running pace.
    public static let announceM = 50.0
    /// A junction is passed this far beyond it: GPS in a town is 10 m off.
    public static let passM = 10.0
    /// The end of the route is reached this close to it,
    public static let arriveM = 25.0
    /// after this many fixes in a row there, none of them poor.
    public static let arriveFixes = 2
    /// Off the route is told after this many fixes in a row beyond
    /// `offRouteM`, lasting `offSeconds`.
    public static let offFixes = 3
    public static let offSeconds = 8.0
    /// Back on the route after this many fixes in a row on it.
    public static let backFixes = 2
    /// A fix less accurate than this, in metres, says nothing about being off.
    public static let poorFixM = 40.0
    /// No fix for this long, in milliseconds, is a gap: the runner may be
    /// anywhere ahead.
    public static let gapMs = 20_000.0
    /// A closed route is joined after this many fixes in a row on a pass
    /// of it, each near the one before,
    public static let joinFixes = 3
    /// once they have gone this far along it, either way. After a detour the
    /// fixes found ahead must have gone this far the route's way too.
    public static let joinM = 20.0

    /// The navigation at the start of a route, and what is told then.
    /// `anywhere`, for a closed route (`StartAnywhere.startsAnywhere`),
    /// starts the run where the runner reaches it: the road it heads out on
    /// is told then.
    public static func start(
        points: [LatLon], directions: [GuideDirection], announceM: Double = announceM,
        anywhere: Bool = false
    ) -> (Navigation, [GuideCue]) {
        let departs = directions.first?.turn == "depart"
        let along = RouteProgress.cumulative(points)
        var navigation = Navigation(
            points: points,
            along: along,
            directions: directions,
            next: departs ? 1 : 0,
            saidUpTo: departs ? 0 : -1,
            announceM: announceM
        )
        if anywhere {
            navigation.loop = StartAnywhere.loopOf(points, along)
        }
        return (navigation, departs && !anywhere ? [.depart(index: 0)] : [])
    }

    /// A fix along the route, or towards a closed route not joined yet.
    public static func onFix(
        _ navigation: Navigation, _ fix: LatLon, _ reading: GuideReading = GuideReading()
    ) -> (Navigation, [GuideCue]) {
        if let loop = navigation.loop, !navigation.arrived {
            return towardsJoin(navigation, loop, fix, reading)
        }
        return follow(navigation, fix, reading)
    }

    /// A fix before the run has joined a closed route. Away from the route,
    /// it is followed as on the way to a route's start. On it, nothing is
    /// told until `joinFixes` fixes in a row on a pass of it have gone
    /// `joinM` along it; then the route is the one from the first of them
    /// round to there, the road it heads out on is told (after «back on the
    /// route» if it was off), and the fix is followed on it.
    static func towardsJoin(
        _ navigation: Navigation, _ loop: RouteLoop, _ fix: LatLon, _ reading: GuideReading
    ) -> (Navigation, [GuideCue]) {
        var seen = navigation
        seen.lastFixMs = reading.timeMs ?? navigation.lastFixMs
        if let accuracyM = reading.accuracyM, accuracyM > poorFixM {
            return (seen, [])
        }
        guard let joining = joiningWith(navigation, loop, fix) else {
            // Farther than `offRouteM` from all the route: off it, from its start.
            var away = navigation
            away.joining = nil
            return follow(away, fix, reading)
        }
        guard let pass = joinedPass(joining) else {
            // Off the route before, the way to it is still shown.
            var waiting = navigation.offRoute ? stillOff(navigation, seen, fix) : seen
            waiting.joining = joining
            waiting.offStreak = nil
            return (waiting, [])
        }
        let route = StartAnywhere.joinRoute(
            navigation.points, navigation.along, navigation.directions, loop,
            joinM: pass.firstM.truncatingRemainder(dividingBy: loop.lengthM))
        let departs = route.directions.first?.turn == "depart"
        var joined = seen
        joined.points = route.points
        joined.along = route.along
        joined.directions = route.directions
        joined.alongM = 0
        joined.next = departs ? 1 : 0
        joined.saidUpTo = departs ? 0 : -1
        joined.offRoute = false
        joined.offStreak = nil
        joined.backFixes = 0
        joined.loop = nil
        joined.joining = nil
        joined.joinedAtM = route.joinedAtM
        var cues: [GuideCue] = navigation.offRoute ? [.backOnRoute] : []
        if departs {
            cues.append(.depart(index: 0))
        }
        let followed = follow(joined, fix, reading)
        return (followed.0, cues + followed.1)
    }

    /// The fixes on a closed route in a row with `fix`, on each pass of it
    /// that they stay on, or nil when it is off the route. The next of a
    /// row is looked for `backM` either way from the last; a row starts on
    /// every pass near its first fix, placed on the loop's second round when
    /// it is in the first half, so that it goes on across the route's start.
    static func joiningWith(
        _ navigation: Navigation, _ loop: RouteLoop, _ fix: LatLon
    ) -> [Navigation.Pass]? {
        let going = (navigation.joining ?? []).compactMap { pass -> Navigation.Pass? in
            let near = RouteProgress.nearest(
                loop.points, loop.along, fix,
                fromM: pass.lastM - RouteProgress.backM, toM: pass.lastM + RouteProgress.backM)
            return near.offM <= RouteProgress.offRouteM
                ? Navigation.Pass(firstM: pass.firstM, lastM: near.alongM, fixes: pass.fixes + 1)
                : nil
        }
        if !going.isEmpty {
            return going
        }
        let passes = RouteProgress.passesNear(navigation.points, navigation.along, fix).map {
            located -> Navigation.Pass in
            let atM = located.alongM < loop.lengthM / 2
                ? located.alongM + loop.lengthM : located.alongM
            return Navigation.Pass(firstM: atM, lastM: atM, fixes: 1)
        }
        return passes.isEmpty ? nil : passes
    }

    /// The pass the run joins, once `joinFixes` fixes on it have gone
    /// `joinM` along it, or nil. The route's way wins; going the other way
    /// on every pass, the run joins all the same.
    static func joinedPass(_ passes: [Navigation.Pass]) -> Navigation.Pass? {
        let gone = { (pass: Navigation.Pass) in pass.lastM - pass.firstM }
        let ready = passes.filter { $0.fixes >= joinFixes && abs(gone($0)) >= joinM }
        let ahead = ready.filter { gone($0) > 0 }
        if var best = ahead.first {
            for pass in ahead.dropFirst() where gone(pass) > gone(best) {
                best = pass
            }
            return best
        }
        // Another pass may be the route's way, still short of `joinM`.
        return passes.contains { gone($0) > 0 } ? nil : ready.first
    }

    /// A fix along the route followed from its start, or from where the run
    /// joined a closed route.
    static func follow(
        _ navigation: Navigation, _ fix: LatLon, _ reading: GuideReading
    ) -> (Navigation, [GuideCue]) {
        if navigation.arrived {
            return (navigation, [])
        }
        let poor = reading.accuracyM.map { $0 > poorFixM } ?? false
        let timeMs = reading.timeMs
        let located = RouteProgress.locate(
            navigation.points, navigation.along, fix, fromM: navigation.alongM)
        var alongM = located.alongM
        var offM = located.offM
        // After a gap the runner may be anywhere ahead.
        let lost = navigation.lost || gapBefore(navigation, timeMs)
        // Off the route, they may get back on it further on than `locate`
        // looks: a street closed, a block run round.
        let detour = navigation.offRoute && navigation.alongM > 0 && !navigation.waitingToJoin
        var found: Navigation.Found?
        if offM > RouteProgress.offRouteM && (lost || detour) {
            // A poor fix neither ends nor extends the fixes found ahead.
            found = poor
                ? navigation.found
                : foundAhead(
                    navigation, fix,
                    aheadM: lost ? .infinity : Rejoin.aheadM(offRunM: navigation.offRunM))
        }
        var rejoined = false
        if let found, found.fixes >= backFixes, lost || found.alongM - found.firstM >= joinM {
            rejoined = true
            alongM = found.alongM
            offM = 0
        }
        // What this fix changes, whatever it says about the route.
        var seen = navigation
        seen.lastFixMs = timeMs ?? navigation.lastFixMs
        seen.lost = lost
        seen.found = found

        if offM > RouteProgress.offRouteM {
            // Where the runner was stays the reference, to find the route again.
            if poor {
                return (seen, [])
            }
            if navigation.offRoute {
                var still = stillOff(navigation, seen, fix)
                still.backFixes = 0
                return (still, [])
            }
            let streak = Navigation.OffStreak(
                fixes: (navigation.offStreak?.fixes ?? 0) + 1,
                sinceMs: navigation.offStreak != nil ? navigation.offStreak?.sinceMs : timeMs
            )
            // Without times, the count alone decides.
            var lasted = true
            if let since = streak.sinceMs, let timeMs {
                lasted = timeMs - since >= offSeconds * 1000
            }
            if streak.fixes < offFixes || !lasted {
                seen.offStreak = streak
                return (seen, [])
            }
            // Once, as the runner leaves: where the route is. Nothing else
            // is told until they are back on it.
            let rejoin = rejoinFor(seen, fix, offRunM: 0)
            seen.offRoute = true
            seen.offStreak = nil
            seen.backFixes = 0
            seen.rejoin = rejoin
            seen.offRunM = 0
            var cues: [GuideCue] = [.offRoute]
            if let rejoin {
                cues.append(.routeAt(distanceM: rejoin.distanceM, bearingDeg: rejoin.bearingDeg))
            }
            return (seen, cues)
        }
        // Fixes found ahead after a gap, or a detour, were `backFixes` on
        // the route already.
        if navigation.offRoute && !rejoined {
            if poor {
                return (seen, [])
            }
            let back = navigation.backFixes + 1
            if back < backFixes {
                var still = stillOff(navigation, seen, fix)
                still.backFixes = back
                return (still, [])
            }
        }
        var cues: [GuideCue] = navigation.offRoute ? [.backOnRoute] : []
        // A poor fix on the route neither ends nor extends a streak off it,
        // nor places a runner lost after a gap.
        let offStreak = poor ? navigation.offStreak : nil
        var placed = seen
        placed.lost = poor && lost
        placed.found = nil
        // Back on the route, there is no way back to show.
        if seen.rejoin != nil {
            placed.rejoin = nil
            placed.offRunM = 0
        }
        let directions = navigation.directions
        var next = navigation.next
        while next < directions.count && directions[next].distanceM + passM <= alongM {
            next += 1
        }
        let total = navigation.along.last ?? 0
        let atEnd = total - alongM <= arriveM
        // A direction within `arriveM` of the end cannot be passed by
        // `passM` before the route ends: at the end, it is behind.
        if atEnd {
            next = directions.count
        }
        var saidUpTo = max(navigation.saidUpTo, next - 1)
        let endFixes = atEnd && !poor ? navigation.endFixes + 1 : 0
        placed.alongM = alongM
        placed.next = next
        placed.offRoute = false
        placed.backFixes = 0
        placed.endFixes = endFixes
        if endFixes >= arriveFixes {
            cues.append(.arrived)
            placed.saidUpTo = saidUpTo
            placed.offStreak = nil
            placed.arrived = true
            return (placed, cues)
        }
        if next < directions.count && next > saidUpTo {
            let aheadM = directions[next].distanceM - alongM
            if aheadM <= navigation.announceM {
                let count = chainCount(directions, from: next)
                cues.append(.turn(index: next, count: count, aheadM: aheadM))
                saidUpTo = next + count - 1
            }
        }
        placed.saidUpTo = saidUpTo
        placed.offStreak = offStreak
        return (placed, cues)
    }

    /// The direction at `index` and how many are joined to it, shown together.
    public static func chainCount(_ directions: [GuideDirection], from index: Int) -> Int {
        var count = 1
        while index + count < directions.count && directions[index + count].joined {
            count += 1
        }
        return count
    }

    /// For the screen: the next direction, how far it is, and how many are
    /// joined to it; nil when none is left.
    public static func upcoming(_ navigation: Navigation) -> (index: Int, inM: Double, count: Int)? {
        let next = navigation.next
        guard next < navigation.directions.count else {
            return nil
        }
        return (
            next,
            max(0, navigation.directions[next].distanceM - navigation.alongM),
            chainCount(navigation.directions, from: next)
        )
    }

    /// Metres left to the end of the route.
    public static func remainingM(_ navigation: Navigation) -> Double {
        max(0, (navigation.along.last ?? 0) - navigation.alongM)
    }

    /// Where along the route a runner off it gets back on it, after
    /// `offRunM` run off it.
    public static func rejoinWindow(
        _ navigation: Navigation, offRunM: Double
    ) -> (fromM: Double, toM: Double) {
        let alongM = navigation.alongM
        if navigation.waitingToJoin {
            return (-.infinity, .infinity)
        }
        if alongM <= 0 {
            return (0, RouteProgress.aheadM)
        }
        let aheadM = navigation.lost ? Double.infinity : Rejoin.aheadM(offRunM: offRunM)
        return (alongM, alongM + aheadM)
    }

    /// Whether a fix at `timeMs` comes `gapMs` or more after the last one,
    /// for a runner placed on the route before.
    static func gapBefore(_ navigation: Navigation, _ timeMs: Double?) -> Bool {
        guard let timeMs, let lastMs = navigation.lastFixMs else {
            return false
        }
        return timeMs - lastMs >= gapMs && navigation.alongM > 0
    }

    /// A fix off the route near where the runner was, placed on the route
    /// ahead after a gap or a detour: near the fix found before, one more in
    /// a row, or else from where the runner was to `aheadM` on.
    static func foundAhead(
        _ navigation: Navigation, _ fix: LatLon, aheadM: Double
    ) -> Navigation.Found? {
        let points = navigation.points
        let along = navigation.along
        if let found = navigation.found {
            let near = RouteProgress.locate(points, along, fix, fromM: found.alongM)
            if near.offM <= RouteProgress.offRouteM {
                return Navigation.Found(
                    firstM: found.firstM, alongM: near.alongM, fixes: found.fixes + 1)
            }
        }
        let far = RouteProgress.locate(
            points, along, fix, fromM: navigation.alongM, aheadM: aheadM)
        return far.offM <= RouteProgress.offRouteM
            ? Navigation.Found(firstM: far.alongM, alongM: far.alongM, fixes: 1)
            : nil
    }

    static func rejoinFor(_ navigation: Navigation, _ fix: LatLon, offRunM: Double) -> Rejoin? {
        let window = rejoinWindow(navigation, offRunM: offRunM)
        return Rejoin.of(
            navigation.points, navigation.along, fix, fromM: window.fromM, toM: window.toM)
    }

    /// `seen` for a runner still off the route: the metres run since it was
    /// left, this step too, and where to get back on it from here.
    static func stillOff(_ navigation: Navigation, _ seen: Navigation, _ fix: LatLon) -> Navigation {
        var still = seen
        if let before = navigation.rejoin?.from {
            still.offRunM = navigation.offRunM + RouteProgress.metresBetween(before, fix)
        } else {
            still.offRunM = navigation.offRunM
        }
        still.rejoin = rejoinFor(seen, fix, offRunM: still.offRunM)
        return still
    }
}
