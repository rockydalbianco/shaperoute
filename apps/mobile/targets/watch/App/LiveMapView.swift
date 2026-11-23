import CoreLocation
import MapKit
import SwiftUI
import WatchCore

/// Where the runner is and has been, during any workout with the GPS
/// (TASK-370 part B5): the line so far for the map of a run without a
/// route, the position and the direction for the arrow on both maps, and
/// the metres climbed. Fed by the TrackRecorder's fixes while running.
@MainActor
final class LiveRun: ObservableObject {
    @Published private(set) var line = LiveLine()
    @Published private(set) var here: LatLon?
    /// The direction of travel, degrees from north; nil standing still.
    @Published private(set) var courseDeg: Double?
    @Published private(set) var climb = Climb()

    /// The GPS's direction says nothing under walking speed.
    static let movingMps = 0.5

    func begin() {
        line = LiveLine()
        here = nil
        courseDeg = nil
        climb = Climb()
    }

    /// A fix of the GPS while running; a paused workout adds nothing.
    func follow(_ fix: CLLocation) {
        guard fix.horizontalAccuracy >= 0, fix.horizontalAccuracy <= Navigator.poorFixM else {
            return
        }
        let point = LatLon(fix.coordinate.latitude, fix.coordinate.longitude)
        here = point
        line.add(point)
        if fix.course >= 0, fix.speed >= Self.movingMps {
            courseDeg = fix.course
        }
        if fix.verticalAccuracy >= 0 {
            climb.add(altitudeM: fix.altitude)
        }
    }
}

/// The map of a run without a route (part B5, the user's «non esce la
/// mappa»): the line run so far in the app's yellow, and the arrow, the
/// map following it, north up.
struct LiveMapView: View {
    @EnvironmentObject private var live: LiveRun
    @State private var camera: MapCameraPosition = .automatic

    /// How much of the street around the arrow the map shows.
    static let spanDeg = 0.005

    var body: some View {
        Map(position: $camera, interactionModes: []) {
            if live.line.points.count > 1 {
                MapPolyline(coordinates: live.line.points.map(\.coordinate))
                    .stroke(.yellow, style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
            }
            if let here = live.here {
                Annotation("", coordinate: here.coordinate) {
                    HereMarker(courseDeg: live.courseDeg)
                }
            }
        }
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .overlay {
            if live.here == nil {
                ProgressView()
            }
        }
        .onAppear(perform: follow)
        .onChange(of: live.here) {
            follow()
        }
    }

    private func follow() {
        guard let here = live.here else {
            return
        }
        withAnimation(.easeInOut(duration: 0.5)) {
            camera = .region(
                MKCoordinateRegion(
                    center: here.coordinate,
                    span: MKCoordinateSpan(latitudeDelta: Self.spanDeg, longitudeDelta: Self.spanDeg)))
        }
    }
}

/// Where the runner is on a map: an arrow towards where they go, a dot
/// while standing still. The same on both maps (part B5).
struct HereMarker: View {
    let courseDeg: Double?

    var body: some View {
        ZStack {
            Circle()
                .fill(.blue)
                .stroke(.white, lineWidth: 2)
                .frame(width: 22, height: 22)
            if let courseDeg {
                Image(systemName: "location.north.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
                    .rotationEffect(.degrees(courseDeg))
            }
        }
        .shadow(radius: 2)
        .accessibilityHidden(true)
    }
}

extension LatLon {
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }
}
