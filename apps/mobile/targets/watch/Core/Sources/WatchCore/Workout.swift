/// One workout on the watch (TASK-370 part A1): its phase and its moving
/// time, the pauses left out. The clock is given to it (`at`, milliseconds
/// since 1970), so the tests need no real time.
public struct Workout: Equatable, Sendable {
    public let activity: String
    public private(set) var phase: WorkoutPhase = .ready
    /// When the clock first ran, at the end of the countdown.
    public private(set) var startedAt: Int64?
    /// The moving time up to the last pause.
    private var movedMs: Int64 = 0
    /// When the clock last started running; nil while it does not run.
    private var runningSince: Int64?

    public init(activity: String) {
        self.activity = activity
    }

    /// Applies `event` at `at`; false, and nothing changed, when it does not
    /// apply in this phase.
    @discardableResult
    public mutating func apply(_ event: WorkoutEvent, at: Int64) -> Bool {
        guard let next = phase.after(event) else {
            return false
        }
        if phase == .running {
            movedMs = movingMs(at: at)
            runningSince = nil
        }
        if next == .running {
            runningSince = at
            if startedAt == nil {
                startedAt = at
            }
        }
        if next == .ready {
            startedAt = nil
            movedMs = 0
        }
        phase = next
        return true
    }

    /// Applies what the other side asked: an end during the countdown stops
    /// it, with nothing recorded.
    @discardableResult
    public mutating func apply(command: WatchCommand, at: Int64) -> Bool {
        switch command {
        case .start:
            return apply(.start, at: at)
        case .pause:
            return apply(.pause, at: at)
        case .resume:
            return apply(.resume, at: at)
        case .end:
            return apply(phase == .countdown ? .cancel : .end, at: at)
        }
    }

    /// The moving time at `at`: never less than the time already counted, if
    /// a clock goes back.
    public func movingMs(at: Int64) -> Int64 {
        guard let since = runningSince else {
            return movedMs
        }
        return movedMs + max(0, at - since)
    }

    /// The message that tells the other side where this workout is.
    public func stateMessage(from: WatchSide, at: Int64, distanceM: Double) -> WatchMessage {
        .state(
            phase: phase, activity: activity, from: from, at: at,
            movingMs: movingMs(at: at), distanceM: distanceM)
    }
}
