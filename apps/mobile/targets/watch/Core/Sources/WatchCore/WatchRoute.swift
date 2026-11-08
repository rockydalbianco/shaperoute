import Foundation

/// A route as the watch follows it on its own (TASK-370 part B3a,
/// ADR-0314): the phone's src/watch/watchRoute.ts, which decides once what
/// the phone decides (the directions as said, the walks that fit, whether a
/// closed route starts where the runner reaches it, whether the sport rides
/// or paddles, how far ahead a turn is told). The watch only follows it:
/// `start()` gives the Navigator and the Pen. Tested on Fixtures/routes.json
/// and Fixtures/messages.json, which the phone's jest reads too.
public struct WatchRoute: Equatable, Sendable {
    /// At most this many points: the phone's MAX_WATCH_POINTS.
    public static let maxPoints = 6000
    /// The turns a direction may say: the engine's.
    static let turns: Set<String> = [
        "depart", "left", "right", "sharp-left", "sharp-right", "straight", "u-turn",
    ]

    /// The key the phone makes from the line: the same route sent again
    /// replaces the one the watch has.
    public var key: String
    /// What it draws, in the phone's language.
    public var title: String
    public var activity: String
    public var distanceM: Double
    public var points: [LatLon]
    public var directions: [GuideDirection]
    /// The stretches with the pen up, as point indices.
    public var walks: [[Int]]
    public var word: String?
    public var anywhere: Bool
    public var ride: Bool
    public var paddle: Bool
    public var announceM: Double

    /// The navigation at the start, what is told then, and the pen of a
    /// route in pieces (nil for one of a piece).
    public func start() -> (Navigation, [GuideCue], Pen?) {
        let (navigation, cues) = Navigator.start(
            points: points, directions: directions, announceM: announceM, anywhere: anywhere)
        let pen = walks.isEmpty
            ? nil
            : Pen.start(
                along: navigation.along, walks: walks.map { ($0[0], $0[1]) }, word: word,
                ride: ride, paddle: paddle)
        return (navigation, cues, pen)
    }

    /// The route in `value`, as a message carries it: the phone's
    /// `decodeWatchRoute`, refusing the same with `invalidField`.
    public static func decode(_ value: Any?) throws -> WatchRoute {
        guard let fields = value as? [String: Any],
            let key = fields["key"] as? String, !key.isEmpty,
            let title = fields["title"] as? String,
            let activity = fields["activity"] as? String, !activity.isEmpty,
            let distanceM = real(fields["distanceM"]), distanceM >= 0,
            let anywhere = boolean(fields["anywhere"]),
            let ride = boolean(fields["ride"]),
            let paddle = boolean(fields["paddle"]),
            let announceM = real(fields["announceM"]), announceM > 0,
            let points = fields["points"] as? [Any],
            let directions = fields["directions"] as? [Any],
            let walks = fields["walks"] as? [Any]
        else {
            throw WatchMessageError.invalidField
        }
        let word: String?
        if fields["word"] is NSNull {
            word = nil
        } else if let text = fields["word"] as? String {
            word = text
        } else {
            throw WatchMessageError.invalidField
        }
        let line = try points.map(point)
        guard line.count >= 2, line.count <= maxPoints else {
            throw WatchMessageError.invalidField
        }
        return WatchRoute(
            key: key, title: title, activity: activity, distanceM: distanceM, points: line,
            directions: try directions.map(direction),
            walks: try fitting(walks, pointCount: line.count),
            word: word, anywhere: anywhere, ride: ride, paddle: paddle, announceM: announceM)
    }

    /// The route as a message carries it.
    public func encoded() -> [String: Any] {
        [
            "key": key,
            "title": title,
            "activity": activity,
            "distanceM": distanceM,
            "points": points.map { [$0.lat, $0.lon] },
            "directions": directions.map { direction -> [String: Any] in
                [
                    "distance_m": direction.distanceM,
                    "turn": direction.turn,
                    "angle_deg": direction.angleDeg,
                    "joined": direction.joined,
                    "street": direction.street ?? NSNull(),
                    "branches": direction.branches,
                ]
            },
            "walks": walks,
            "word": word ?? NSNull(),
            "anywhere": anywhere,
            "ride": ride,
            "paddle": paddle,
            "announceM": announceM,
        ]
    }

    static func point(_ value: Any) throws -> LatLon {
        guard let pair = value as? [Any], pair.count == 2,
            let lat = real(pair[0]), let lon = real(pair[1]),
            abs(lat) <= 90, abs(lon) <= 180
        else {
            throw WatchMessageError.invalidField
        }
        return LatLon(lat, lon)
    }

    static func direction(_ value: Any) throws -> GuideDirection {
        guard let fields = value as? [String: Any],
            let distanceM = real(fields["distance_m"]), distanceM >= 0,
            let turn = fields["turn"] as? String, turns.contains(turn),
            let angleDeg = real(fields["angle_deg"]),
            let joined = boolean(fields["joined"]),
            let branches = integer(fields["branches"]), branches >= 0
        else {
            throw WatchMessageError.invalidField
        }
        let street: String?
        if fields["street"] is NSNull {
            street = nil
        } else if let name = fields["street"] as? String {
            street = name
        } else {
            throw WatchMessageError.invalidField
        }
        return GuideDirection(
            distanceM: distanceM, turn: turn, angleDeg: angleDeg, joined: joined,
            street: street, branches: Int(branches))
    }

    /// The walks when they fit the points, as the phone's `walksOf` keeps
    /// them: whole indices, in order, one after the other, each at least one
    /// step long. Unlike the phone, which drops walks that do not fit, a
    /// message with one is refused: the phone never sends it.
    static func fitting(_ walks: [Any], pointCount: Int) throws -> [[Int]] {
        var after = 0
        return try walks.map { walk -> [Int] in
            guard let pair = walk as? [Any], pair.count == 2,
                let from = integer(pair[0]), let to = integer(pair[1]),
                from >= after, to > from, to < pointCount
            else {
                throw WatchMessageError.invalidField
            }
            after = Int(to)
            return [Int(from), Int(to)]
        }
    }
}
