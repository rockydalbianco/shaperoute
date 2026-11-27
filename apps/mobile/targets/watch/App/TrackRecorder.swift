import CoreLocation
import Foundation
import HealthKit
import WatchCore

/// The positions of a workout with the GPS (TASK-370 part B3c, ADR-0314):
/// the watch's own, with or without a route. Kept in WatchCore's TrackLog
/// for the phone, which gets the finished workout as a file; and in an
/// `HKWorkoutRouteBuilder`, so that the line is also in the workout Apple
/// Health saves («un'attività, un allenamento», TASK-321). Each position
/// goes on to the guidance (`onFix`) on a run with a route.
@MainActor
final class TrackRecorder: NSObject {
    /// A position as it comes, for the guidance.
    var onFix: ((CLLocation) -> Void)?

    private let location = CLLocationManager()
    private var routeBuilder: HKWorkoutRouteBuilder?
    private(set) var log = TrackLog()
    private var recording = false

    override init() {
        super.init()
        location.delegate = self
        location.desiredAccuracy = kCLLocationAccuracyBest
        location.distanceFilter = kCLDistanceFilterNone
    }

    /// A workout of a sport with the GPS about to start: the location asked
    /// for now, during the countdown. In the air (TASK-305 part R4) the
    /// positions are a flight's: Apple's `.airborne` does not hold them to
    /// roads and paths.
    func prepare(store: HKHealthStore, ride: Bool, air: Bool = false) {
        log = TrackLog()
        routeBuilder = HKHealthStore.isHealthDataAvailable()
            ? HKWorkoutRouteBuilder(healthStore: store, device: nil) : nil
        location.activityType = air ? .airborne : ride ? .otherNavigation : .fitness
        location.requestWhenInUseAuthorization()
    }

    /// The countdown ended: the positions start.
    func start() {
        recording = true
        location.startUpdatingLocation()
    }

    func pause(at ms: Int64) {
        log.pause(at: ms)
    }

    func resume(at ms: Int64) {
        log.resume(at: ms)
    }

    /// No more positions: the workout ended, or never started.
    func stop() {
        recording = false
        location.stopUpdatingLocation()
    }

    /// The line added to the workout Apple Health saved.
    func finishRoute(with workout: HKWorkout?) {
        guard let routeBuilder, let workout else {
            self.routeBuilder = nil
            return
        }
        routeBuilder.finishRoute(with: workout, metadata: nil) { _, _ in }
        self.routeBuilder = nil
    }

    /// Nothing kept: a workout ended during its countdown.
    func discard() {
        stop()
        routeBuilder?.discard()
        routeBuilder = nil
        log = TrackLog()
    }

    private func received(_ locations: [CLLocation]) {
        guard recording else {
            return
        }
        let good = locations.filter {
            $0.horizontalAccuracy >= 0 && $0.horizontalAccuracy <= Navigator.poorFixM
        }
        if !good.isEmpty {
            routeBuilder?.insertRouteData(good) { _, _ in }
        }
        for fix in locations where fix.horizontalAccuracy >= 0 {
            log.add(
                TrackFixPoint(
                    point: LatLon(fix.coordinate.latitude, fix.coordinate.longitude),
                    timeMs: Int64((fix.timestamp.timeIntervalSince1970 * 1000).rounded(.down)),
                    accuracyM: fix.horizontalAccuracy,
                    altitudeM: fix.verticalAccuracy >= 0 ? fix.altitude : nil))
            onFix?(fix)
        }
    }
}

extension TrackRecorder: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            self.received(locations)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}
}
