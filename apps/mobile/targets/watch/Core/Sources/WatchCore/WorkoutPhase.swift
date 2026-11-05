/// Where a workout is (TASK-370 part A1): the same names on the watch and on
/// the phone (src/watch/watchMessages.ts, `WATCH_PHASES`), in the order a
/// workout goes through them.
public enum WorkoutPhase: String, CaseIterable, Sendable {
    case ready
    case countdown
    case running
    case paused
    case finished
}

/// What moves a workout from one phase to the next.
public enum WorkoutEvent: String, CaseIterable, Sendable {
    /// From the wrist or the phone: the countdown starts.
    case start
    /// The countdown is over: the clock runs.
    case countdownDone
    /// Stopped during the countdown: back to ready, nothing recorded.
    case cancel
    case pause
    case resume
    case end
    /// A finished workout saved or thrown away: ready for the next one.
    case reset
}

extension WorkoutPhase {
    /// The phase after `event`, or nil when `event` does not apply here: a
    /// pause while paused, a resume while running. The table is
    /// Fixtures/transitions.json, which the tests read.
    public func after(_ event: WorkoutEvent) -> WorkoutPhase? {
        switch (self, event) {
        case (.ready, .start):
            return .countdown
        case (.countdown, .countdownDone):
            return .running
        case (.countdown, .cancel):
            return .ready
        case (.running, .pause):
            return .paused
        case (.paused, .resume):
            return .running
        case (.running, .end), (.paused, .end):
            return .finished
        case (.finished, .reset):
            return .ready
        default:
            return nil
        }
    }
}
