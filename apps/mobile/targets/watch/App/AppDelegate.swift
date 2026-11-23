import HealthKit
import WatchKit

/// The app woken by the phone (TASK-370 part B4): at the run's countdown
/// the phone asks Apple to start a workout here
/// (`HKHealthStore.startWatchApp`), which launches MuW even when it is
/// closed and hands it the workout's configuration. The workouts are made
/// with the app; a configuration that comes first waits for them.
final class AppDelegate: NSObject, WKApplicationDelegate {
    @MainActor static var workouts: WorkoutManager? {
        didSet {
            if let workouts, let waiting {
                Self.waiting = nil
                workouts.wake(waiting)
            }
        }
    }

    @MainActor private static var waiting: HKWorkoutConfiguration?

    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        Task { @MainActor in
            if let workouts = Self.workouts {
                workouts.wake(workoutConfiguration)
            } else {
                Self.waiting = workoutConfiguration
            }
        }
    }
}
