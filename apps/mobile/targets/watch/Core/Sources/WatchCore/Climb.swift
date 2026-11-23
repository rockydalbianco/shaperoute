import Foundation

/// The metres climbed during a workout (TASK-370 part B5), counted as the
/// phone's run screen does (src/navigation/runMetrics.ts, climbM): the sum
/// of the rises, each at least `stepM` above the last height that counted,
/// since the GPS's height wanders by a few metres standing still. Descents
/// take nothing away. A height at a time, so a long workout costs nothing.
public struct Climb: Equatable, Sendable {
    /// The phone's CLIMB_STEP_M.
    public static let stepM = 3.0

    /// The metres climbed; nil until a height came.
    public var metres: Double? { from == nil ? nil : climbed }

    private var from: Double?
    private var climbed = 0.0

    public init() {}

    public mutating func add(altitudeM: Double?) {
        guard let height = altitudeM, height.isFinite else {
            return
        }
        guard let last = from else {
            from = height
            return
        }
        if height - last >= Self.stepM {
            climbed += height - last
            from = height
        } else if last - height >= Self.stepM {
            from = height
        }
    }
}
