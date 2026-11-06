/// The last whole kilometre (or mile) of a workout: which one, and the
/// seconds it took.
public struct WatchSplit: Equatable, Sendable {
    public let number: Int
    public let seconds: Double
}

/// The pace now and the last whole kilometre (TASK-370 part A2), with the
/// rules of the app's run screen (src/navigation/runStats.ts `recentPaceS`
/// and `lastKmS`). The phone reads them from GPS fixes; the watch from the
/// distance Apple Health gives it with the moving time, so a pause counts
/// neither its time nor its metres.
public struct WatchPaces: Equatable, Sendable {
    /// "Pace now" is the pace over this much of the way behind: long enough
    /// to smooth the GPS, short enough to follow a change of pace.
    public static let recentM = 200.0
    /// Slower than this, seconds a kilometre, is standing, not running.
    public static let standingSPerKm = 20.0 * 60
    /// A swim is slower: 6:00 every 100 m.
    public static let swimStandingSPerKm = 60.0 * 60

    public struct Sample: Equatable, Sendable {
        public let movingMs: Int64
        public let metres: Double
    }

    public private(set) var samples: [Sample] = []

    public init() {}

    /// The distance at a moving time; only a step forward is kept.
    public mutating func add(movingMs: Int64, metres: Double) {
        if let last = samples.last, movingMs < last.movingMs || metres <= last.metres {
            return
        }
        samples.append(Sample(movingMs: movingMs, metres: metres))
    }

    /// Seconds a kilometre over the last `recentM` up to `movingNowMs`; nil
    /// before `WatchFormat.minPaceM`, and when standing. The time goes on
    /// between samples, so who stops sees the pace slow down, then nothing.
    public func recentPaceS(movingNowMs: Int64, standingSPerKm: Double = standingSPerKm)
        -> Double?
    {
        guard let last = samples.last else {
            return nil
        }
        var from = samples.count - 1
        while from > 0 && last.metres - samples[from].metres < Self.recentM {
            from -= 1
        }
        let metres = last.metres - samples[from].metres
        guard metres >= WatchFormat.minPaceM else {
            return nil
        }
        let ms = max(movingNowMs, last.movingMs) - samples[from].movingMs
        let pace = Double(ms) / metres
        return pace > standingSPerKm ? nil : pace
    }

    /// The last whole unit of `unitM` metres (a kilometre, or a mile's
    /// metres); nil before the first. The moment a unit ends falls between
    /// two samples, in proportion.
    public func lastSplit(unitM: Double = 1000) -> WatchSplit? {
        guard let last = samples.last, unitM > 0 else {
            return nil
        }
        let number = Int((last.metres / unitM).rounded(.down))
        guard number >= 1 else {
            return nil
        }
        let end = movingMs(at: Double(number) * unitM)
        let start = number == 1 ? 0 : movingMs(at: Double(number - 1) * unitM)
        return WatchSplit(number: number, seconds: (end - start) / 1000)
    }

    /// The moving time when the workout passed `metres`.
    private func movingMs(at metres: Double) -> Double {
        guard let after = samples.firstIndex(where: { $0.metres >= metres }) else {
            return Double(samples.last?.movingMs ?? 0)
        }
        let next = samples[after]
        guard after > 0 else {
            return Double(next.movingMs)
        }
        let before = samples[after - 1]
        let share = (metres - before.metres) / (next.metres - before.metres)
        return Double(before.movingMs) + share * Double(next.movingMs - before.movingMs)
    }
}
