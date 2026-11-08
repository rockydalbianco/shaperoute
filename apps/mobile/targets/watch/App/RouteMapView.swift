import MapKit
import SwiftUI
import WatchCore

/// The small map of a run with a route (TASK-370 part B3b): the line, and
/// where the runner is, one swipe after the arrow.
struct RouteMapView: View {
    @EnvironmentObject private var guide: GuideSession

    var body: some View {
        if let route = guide.route {
            Map(initialPosition: .region(Self.region(of: route.points))) {
                MapPolyline(coordinates: route.points.map {
                    CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lon)
                })
                .stroke(.yellow, lineWidth: 4)
                if let here = guide.position {
                    Annotation("", coordinate: CLLocationCoordinate2D(latitude: here.lat, longitude: here.lon)) {
                        Circle()
                            .fill(.blue)
                            .stroke(.white, lineWidth: 2)
                            .frame(width: 12, height: 12)
                    }
                }
            }
            .mapStyle(.standard(pointsOfInterest: .excludingAll))
        }
    }

    /// The whole drawing, with a margin of a fifth around it.
    static func region(of points: [LatLon]) -> MKCoordinateRegion {
        let lats = points.map(\.lat)
        let lons = points.map(\.lon)
        let (south, north) = (lats.min() ?? 0, lats.max() ?? 0)
        let (west, east) = (lons.min() ?? 0, lons.max() ?? 0)
        return MKCoordinateRegion(
            center: CLLocationCoordinate2D(
                latitude: (south + north) / 2, longitude: (west + east) / 2),
            span: MKCoordinateSpan(
                latitudeDelta: max(0.002, (north - south) * 1.4),
                longitudeDelta: max(0.002, (east - west) * 1.4)))
    }
}
