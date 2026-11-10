import CoreLocation
import Foundation
import WatchCore
import WatchKit

/// A run along a route on the wrist alone (TASK-370 part B3b, ADR-0314):
/// the watch's GPS, WatchCore's Navigator and Pen at each fix, and what
/// they tell shown (GuideDisplay) and felt, with watchOS's own navigation
/// vibrations (the user's choice «Come Apple Maps»). The workout keeps the
/// app running with the screen down; the track for the phone is part B3c.
@MainActor
final class GuideSession: NSObject, ObservableObject {
    /// The route followed; nil on a run without one.
    @Published private(set) var route: WatchRoute?
    @Published private(set) var screen: GuideScreen?
    /// Where the runner is, for the small map.
    @Published private(set) var position: LatLon?

    private var navigation: Navigation?
    private var pen: Pen?
    private let location = CLLocationManager()

    override init() {
        super.init()
        location.delegate = self
        location.desiredAccuracy = kCLLocationAccuracyBest
        location.distanceFilter = kCLDistanceFilterNone
    }

    /// A run along `route` about to start: the guidance from its start, and
    /// the location asked for now, during the countdown.
    func begin(_ route: WatchRoute) {
        let (navigation, _, pen) = route.start()
        self.route = route
        self.navigation = navigation
        self.pen = pen
        position = nil
        screen = GuideDisplay.screen(navigation, pen: pen, headingDeg: nil)
        location.activityType = route.ride ? .otherNavigation : .fitness
        location.requestWhenInUseAuthorization()
    }

    /// The countdown ended: the fixes start.
    func run() {
        guard route != nil else {
            return
        }
        location.startUpdatingLocation()
    }

    /// The workout ended: no more fixes, no route.
    func stop() {
        location.stopUpdatingLocation()
        route = nil
        navigation = nil
        pen = nil
        screen = nil
        position = nil
    }

    private func follow(_ fix: CLLocation) {
        guard var navigation, fix.horizontalAccuracy >= 0 else {
            return
        }
        let point = LatLon(fix.coordinate.latitude, fix.coordinate.longitude)
        let reading = GuideReading(
            accuracyM: fix.horizontalAccuracy,
            timeMs: (fix.timestamp.timeIntervalSince1970 * 1000).rounded(.down))
        let (next, cues) = Navigator.onFix(navigation, point, reading)
        navigation = next
        var told = cues
        if let pen {
            let moved = Pen.move(pen, alongM: navigation.alongM, accuracyM: reading.accuracyM)
            self.pen = moved.0
            told += moved.2
        }
        self.navigation = navigation
        position = point
        screen = GuideDisplay.screen(
            navigation, pen: self.pen, headingDeg: fix.course >= 0 ? fix.course : nil)
        for haptic in GuideDisplay.haptics(for: told, directions: navigation.directions) {
            WKInterfaceDevice.current().play(Self.played(haptic))
        }
    }

    /// watchOS's vibration for each: Apple Maps' own for the turns.
    static func played(_ haptic: GuideHaptic) -> WKHapticType {
        switch haptic {
        case .right:
            return .navigationRightTurn
        case .left:
            return .navigationLeftTurn
        case .maneuver:
            return .navigationGenericManeuver
        case .offRoute:
            return .failure
        case .backOnRoute, .arrived:
            return .success
        case .pen:
            return .click
        }
    }
}

extension GuideSession: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            for fix in locations {
                self.follow(fix)
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}
}
