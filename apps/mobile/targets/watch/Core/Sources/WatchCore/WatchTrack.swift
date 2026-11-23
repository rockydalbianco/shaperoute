import Foundation

/// A position the watch kept during a workout.
public struct TrackFixPoint: Equatable, Sendable {
    public var point: LatLon
    /// When it was taken, milliseconds since 1970.
    public var timeMs: Int64
    /// Radius of its error, in metres, when the GPS gives it.
    public var accuracyM: Double?
    /// Height above the sea, in metres, when the GPS gives it.
    public var altitudeM: Double?

    public init(point: LatLon, timeMs: Int64, accuracyM: Double?, altitudeM: Double?) {
        self.point = point
        self.timeMs = timeMs
        self.accuracyM = accuracyM
        self.altitudeM = altitudeM
    }
}

/// A stretch of the workout that is not of it: the runner paused.
public struct TrackPause: Equatable, Sendable {
    public var fromMs: Int64
    public var toMs: Int64
}

/// The route a workout followed, as the phone needs it back to score the
/// drawing (the phone may no longer have it).
public struct TrackedRoute: Equatable, Sendable {
    public var key: String
    public var title: String
    public var points: [LatLon]
    public var walks: [[Int]]
    public var word: String?
    /// How much the route looks like its shape; nil when the phone did not
    /// say.
    public var similarity: Double?

    public init(_ route: WatchRoute) {
        key = route.key
        title = route.title
        points = route.points
        walks = route.walks
        word = route.word
        similarity = route.similarity
    }

    init(
        key: String, title: String, points: [LatLon], walks: [[Int]], word: String?,
        similarity: Double?
    ) {
        self.key = key
        self.title = title
        self.points = points
        self.walks = walks
        self.word = word
        self.similarity = similarity
    }
}

/// A workout of the watch, finished, as it goes to the phone in a file
/// (TASK-370 part B3c): the phone opens it as a run of its own, with «Save»
/// and the form of always (the user's choice «Avviso e scheda»). The phone
/// reads the same fields (src/watch/watchTrack.ts), both tested on
/// Fixtures/tracks.json. A fix is `[lat, lon, timeMs, accuracyM, altitudeM]`.
public struct WatchTrack: Equatable, Sendable {
    public static let version = 1
    /// At most this many fixes: the phone's MAX_POINTS for a run it saves.
    public static let maxFixes = 20_000

    public enum Status: String, Sendable {
        /// The runner ended it.
        case stopped
        /// The end of the route was reached.
        case arrived
    }

    public var activity: String
    public var startedAtMs: Int64
    public var endedAtMs: Int64
    public var status: Status
    /// nil for a workout without a route.
    public var route: TrackedRoute?
    public var fixes: [TrackFixPoint]
    public var pauses: [TrackPause]
    /// As Apple Health measured it.
    public var distanceM: Double
    public var movingMs: Int64
    public var kcal: Double?
    public var heartAvgBpm: Int?

    /// The file's JSON values.
    public func encoded() -> [String: Any] {
        [
            "v": Self.version,
            "activity": activity,
            "startedAtMs": startedAtMs,
            "endedAtMs": endedAtMs,
            "status": status.rawValue,
            "route": route.map { route -> Any in
                [
                    "key": route.key,
                    "title": route.title,
                    "points": route.points.map { [$0.lat, $0.lon] },
                    "walks": route.walks,
                    "word": route.word ?? NSNull(),
                    "similarity": route.similarity ?? NSNull(),
                ] as [String: Any]
            } ?? NSNull(),
            "fixes": fixes.map { fix -> [Any] in
                [
                    fix.point.lat, fix.point.lon, fix.timeMs,
                    fix.accuracyM ?? NSNull(), fix.altitudeM ?? NSNull(),
                ]
            },
            "pauses": pauses.map { ["fromMs": $0.fromMs, "toMs": $0.toMs] },
            "distanceM": distanceM,
            "movingMs": movingMs,
            "kcal": kcal ?? NSNull(),
            "heartAvgBpm": heartAvgBpm ?? NSNull(),
        ]
    }

    /// The file as JSON bytes.
    public func data() throws -> Data {
        try JSONSerialization.data(withJSONObject: encoded())
    }

    /// The track in `value`; refused, as the phone refuses it, with
    /// `unsupportedVersion` for a newer file and `invalidField` otherwise.
    public static func decode(_ value: Any?) throws -> WatchTrack {
        guard let fields = value as? [String: Any] else {
            throw WatchMessageError.notAnObject
        }
        guard let version = integer(fields["v"]), version >= 1 else {
            throw WatchMessageError.invalidField
        }
        guard version <= Int64(Self.version) else {
            throw WatchMessageError.unsupportedVersion
        }
        guard let activity = fields["activity"] as? String, !activity.isEmpty,
            let startedAtMs = integer(fields["startedAtMs"]), startedAtMs >= 0,
            let endedAtMs = integer(fields["endedAtMs"]), endedAtMs >= startedAtMs,
            let statusName = fields["status"] as? String,
            let status = Status(rawValue: statusName),
            let fixes = fields["fixes"] as? [Any], fixes.count <= maxFixes,
            let pauses = fields["pauses"] as? [Any],
            let distanceM = real(fields["distanceM"]), distanceM >= 0,
            let movingMs = integer(fields["movingMs"]), movingMs >= 0
        else {
            throw WatchMessageError.invalidField
        }
        return WatchTrack(
            activity: activity, startedAtMs: startedAtMs, endedAtMs: endedAtMs, status: status,
            route: try trackedRoute(fields["route"]),
            fixes: try fixesOf(fixes),
            pauses: try pauses.map(pause),
            distanceM: distanceM, movingMs: movingMs,
            kcal: try optionalReal(fields["kcal"]),
            heartAvgBpm: try optionalInteger(fields["heartAvgBpm"]).map { Int($0) })
    }

    static func trackedRoute(_ value: Any?) throws -> TrackedRoute? {
        if value == nil || value is NSNull {
            return nil
        }
        guard let fields = value as? [String: Any],
            let key = fields["key"] as? String, !key.isEmpty,
            let title = fields["title"] as? String,
            let points = fields["points"] as? [Any],
            let walks = fields["walks"] as? [Any]
        else {
            throw WatchMessageError.invalidField
        }
        let line = try points.map(WatchRoute.point)
        guard line.count >= 2 else {
            throw WatchMessageError.invalidField
        }
        let word: String?
        if fields["word"] == nil || fields["word"] is NSNull {
            word = nil
        } else if let text = fields["word"] as? String {
            word = text
        } else {
            throw WatchMessageError.invalidField
        }
        return TrackedRoute(
            key: key, title: title, points: line,
            walks: try WatchRoute.fitting(walks, pointCount: line.count), word: word,
            similarity: try optionalReal(fields["similarity"]))
    }

    /// The fixes, in time order: a fix not after the one before is refused,
    /// as the phone would not know where to put it.
    static func fixesOf(_ values: [Any]) throws -> [TrackFixPoint] {
        var last: Int64 = -1
        return try values.map { value -> TrackFixPoint in
            guard let parts = value as? [Any], parts.count == 5,
                let lat = real(parts[0]), let lon = real(parts[1]),
                abs(lat) <= 90, abs(lon) <= 180,
                let timeMs = integer(parts[2]), timeMs > last
            else {
                throw WatchMessageError.invalidField
            }
            last = timeMs
            return TrackFixPoint(
                point: LatLon(lat, lon), timeMs: timeMs,
                accuracyM: try optionalReal(parts[3]), altitudeM: try optionalReal(parts[4]))
        }
    }

    static func pause(_ value: Any) throws -> TrackPause {
        guard let fields = value as? [String: Any],
            let fromMs = integer(fields["fromMs"]), let toMs = integer(fields["toMs"]),
            toMs >= fromMs
        else {
            throw WatchMessageError.invalidField
        }
        return TrackPause(fromMs: fromMs, toMs: toMs)
    }

    static func optionalReal(_ value: Any?) throws -> Double? {
        if value == nil || value is NSNull {
            return nil
        }
        guard let number = real(value) else {
            throw WatchMessageError.invalidField
        }
        return number
    }

    static func optionalInteger(_ value: Any?) throws -> Int64? {
        if value == nil || value is NSNull {
            return nil
        }
        guard let number = integer(value) else {
            throw WatchMessageError.invalidField
        }
        return number
    }
}

/// The positions and pauses of a workout as they come, kept as the phone
/// keeps them (trackRecorder.ts): a fix less accurate than
/// `Navigator.poorFixM`, or not after the one before, or during a pause, is
/// left out. Pure: the app feeds it from CoreLocation.
public struct TrackLog: Equatable, Sendable {
    public private(set) var fixes: [TrackFixPoint] = []
    public private(set) var pauses: [TrackPause] = []
    /// When the pause going on began; nil while running.
    public private(set) var pausedSinceMs: Int64?

    public init() {}

    public mutating func add(_ fix: TrackFixPoint) {
        guard pausedSinceMs == nil else {
            return
        }
        if let accuracy = fix.accuracyM, accuracy > Navigator.poorFixM {
            return
        }
        if let last = fixes.last, fix.timeMs <= last.timeMs {
            return
        }
        fixes.append(fix)
    }

    public mutating func pause(at ms: Int64) {
        if pausedSinceMs == nil {
            pausedSinceMs = ms
        }
    }

    public mutating func resume(at ms: Int64) {
        if let since = pausedSinceMs {
            pauses.append(TrackPause(fromMs: since, toMs: max(since, ms)))
            pausedSinceMs = nil
        }
    }

    /// The workout finished at `endedAtMs`: a pause still going on ends
    /// there, and a track longer than `WatchTrack.maxFixes` keeps one fix
    /// every so many, the first and the last always.
    public func track(
        activity: String, startedAtMs: Int64, endedAtMs: Int64, status: WatchTrack.Status,
        route: WatchRoute?, distanceM: Double, movingMs: Int64, kcal: Double?, heartAvgBpm: Int?
    ) -> WatchTrack {
        var log = self
        log.resume(at: endedAtMs)
        return WatchTrack(
            activity: activity, startedAtMs: startedAtMs, endedAtMs: endedAtMs, status: status,
            route: route.map(TrackedRoute.init), fixes: Self.evenly(log.fixes, most: WatchTrack.maxFixes),
            pauses: log.pauses, distanceM: distanceM, movingMs: movingMs, kcal: kcal,
            heartAvgBpm: heartAvgBpm)
    }

    static func evenly<T>(_ items: [T], most: Int) -> [T] {
        guard items.count > most, most >= 2 else {
            return items
        }
        let step = Double(items.count - 1) / Double(most - 1)
        return (0..<most).map { items[Int((Double($0) * step).rounded())] }
    }
}
