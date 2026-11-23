import Foundation

/// The five heart rate zones of «Heart rate zones» on the phone (TASK-374
/// part B, src/body/heartZones.ts), which the phone sends with its settings
/// (TASK-370 part B5): the six limits, from the bottom of zone 1 to the max
/// heart rate, in beats a minute. The watch only reads them: the phone
/// counts them from the age, the max or the limits set by hand.
public struct HeartZones: Equatable, Sendable {
    public static let count = 5
    /// The heart rates a limit may have: the phone's lowest resting heart
    /// rate to a heart rate the watch reads (WatchMessage's heartRate).
    public static let bpmRange = 30...300

    public let limits: [Int]

    /// Nil unless there are six limits, each in `bpmRange`, each over the
    /// one before.
    public init?(limits: [Int]) {
        guard limits.count == Self.count + 1,
            limits.allSatisfy({ Self.bpmRange.contains($0) }),
            zip(limits, limits.dropFirst()).allSatisfy({ $0 < $1 })
        else {
            return nil
        }
        self.limits = limits
    }

    /// The zone `bpm` is in, 1 to 5: over the max still the last, under the
    /// first none (WatchHeart.tsx's zoneOf).
    public func zone(of bpm: Int) -> Int? {
        guard bpm >= limits[0] else {
            return nil
        }
        for zone in 1...Self.count where bpm < limits[zone] {
            return zone
        }
        return Self.count
    }
}
