import Foundation

/// The watch app woken by the phone (TASK-370 part B4): the phone asks
/// Apple to start a workout on the watch (`HKHealthStore.startWatchApp`),
/// which launches the app even when it is closed, with a workout
/// configuration that says only Apple's activity type and indoors or
/// outdoors. The phone's start message, with the app's own sport, follows
/// once the app is up; until `waitS` has gone by, the watch waits for it.
public enum WatchWake {
    /// How long the woken watch waits for the phone's start before it
    /// starts the sport of the configuration on its own.
    public static let waitS = 3.0

    /// The sport of a configuration, among the ones the watch offers: the
    /// first with Apple's activity type and the same GPS (a run outdoors,
    /// the gym indoors), else the first with the activity type; none when
    /// the watch has no such sport.
    public static func sport(
        appleWorkout: Int, outdoor: Bool, among sports: [WatchSport]
    ) -> WatchSport? {
        let same = sports.filter { $0.appleWorkout == appleWorkout }
        return same.first { $0.gps == outdoor } ?? same.first
    }
}
