import Foundation

/// The units the watch writes distances in, as the app's setting.
public enum WatchUnits: String, CaseIterable, Sendable {
    case km
    case mi

    /// The metres in one of them.
    public var metres: Double {
        self == .mi ? 1609.344 : 1000
    }
}

/// How the watch writes its numbers (TASK-370 part A2): the same texts as
/// the run screen of the app (src/navigation/freeRun.ts `clockLabel`,
/// src/units/format.ts `runDistanceLabel` and `paceLabel`, paddle.ts and
/// swim.ts). Both read Fixtures/format.json.
public enum WatchFormat {
    /// Below this the pace is noise: the first strides and the GPS settling.
    public static let minPaceM = 100.0

    /// "0:07", "12:34", "1:02:03": a running clock.
    public static func clock(ms: Int64) -> String {
        let total = max(0, ms / 1000)
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let seconds = two(total % 60)
        return hours > 0 ? "\(hours):\(two(minutes)):\(seconds)" : "\(minutes):\(seconds)"
    }

    /// "4.01 km", "2.49 mi": two decimals and a point in every language.
    public static func distance(metres: Double, units: WatchUnits = .km) -> String {
        "\(fixed2(max(0, metres) / units.metres)) \(units.rawValue)"
    }

    /// "4:44 /km", "7:37 /mi", "2:30 /500 m" on the water, "2:05 /100 m"
    /// swimming: the average pace; nil before `minPaceM`.
    public static func pace(
        metres: Double, ms: Int64, pace: WatchPace, units: WatchUnits = .km
    ) -> String? {
        guard metres >= minPaceM, ms > 0 else {
            return nil
        }
        // Milliseconds a metre are seconds a kilometre, as the app reckons.
        return self.pace(perKmS: Double(ms) / metres, pace: pace, units: units)
    }

    /// A pace of `perKmS` seconds a kilometre, written as `pace` says:
    /// "4:44 /km", "2:30 /500 m".
    public static func pace(perKmS: Double, pace: WatchPace, units: WatchUnits = .km) -> String {
        switch pace {
        case .km:
            return "\(paceClock(perKmS * (units.metres / 1000))) /\(units.rawValue)"
        case .paddle:
            return "\(paceClock((perKmS * 500) / 1000)) /500 m"
        case .swim:
            return "\(paceClock((perKmS * 100) / 1000)) /100 m"
        }
    }

    /// "5:42": minutes and seconds, rounded as JavaScript's Math.round.
    public static func paceClock(_ seconds: Double) -> String {
        let whole = Int64((seconds + 0.5).rounded(.down))
        return "\(whole / 60):\(two(whole % 60))"
    }

    private static func two(_ value: Int64) -> String {
        value < 10 ? "0\(value)" : "\(value)"
    }

    /// `value` with two decimals as JavaScript's toFixed(2) writes it. The
    /// two differ only on an exact half (0.125): toFixed takes the larger,
    /// "%.2f" the even one. Such a value times 8 is an odd whole number.
    private static func fixed2(_ value: Double) -> String {
        let eighths = value * 8
        let half = eighths.rounded(.down) == eighths
            && eighths.truncatingRemainder(dividingBy: 2) == 1
        return String(format: "%.2f", half ? value + 0.001 : value)
    }
}
