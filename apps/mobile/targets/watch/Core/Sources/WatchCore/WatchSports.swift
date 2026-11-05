import Foundation

/// How the pace of a sport is written on the watch, as in the app: per km
/// (or mile), per 500 m on the water, per 100 m swimming.
public enum WatchPace: String, Codable, Sendable {
    case km
    case paddle
    case swim
}

/// A sport as the watch knows it (TASK-370 part A1). The table is
/// Resources/sports.json, generated from the app's sport registry
/// (src/watch/watchSports.ts, scripts/watch-sports.sh); a jest test keeps
/// the two the same.
public struct WatchSport: Codable, Equatable, Sendable {
    /// The activity of the app: "running", "cycling", …
    public let activity: String
    /// In English, as the app names it; translated by the watch app.
    public let name: String
    public let emoji: String
    /// HKWorkoutActivityType, Apple's own number.
    public let appleWorkout: Int
    public let pace: WatchPace
    /// On a lake or the sea: no climb to speak of.
    public let onWater: Bool
    /// The app draws routes for it, so the watch can follow one; false, it
    /// only records.
    public let guided: Bool
    /// Outdoors with the watch's GPS; false indoors (the gym).
    public let gps: Bool
    /// Offered on the watch: the open-water swim is not, until it is tried
    /// in the water.
    public let onWatch: Bool
}

/// The sport table of the watch.
public enum WatchSports {
    /// The version of sports.json this code reads.
    public static let version = 1

    private struct File: Decodable {
        let version: Int
        let sports: [WatchSport]
    }

    /// Every sport of the app, in its order; the ones off on the watch too.
    public static func all() throws -> [WatchSport] {
        guard let url = Bundle.module.url(forResource: "sports", withExtension: "json")
        else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try read(Data(contentsOf: url))
    }

    /// The sports in `data`, the bytes of a sports.json.
    public static func read(_ data: Data) throws -> [WatchSport] {
        let file = try JSONDecoder().decode(File.self, from: data)
        guard file.version == version else {
            throw CocoaError(.fileReadCorruptFile)
        }
        return file.sports
    }

    /// The sports the watch offers, in their order.
    public static func offered() throws -> [WatchSport] {
        try all().filter(\.onWatch)
    }
}
