import SwiftUI
import MapKit

struct RouteMapView: View {
    let waypoints: [Waypoint]

    @State private var cameraPosition: MapCameraPosition

    init(waypoints: [Waypoint]) {
        self.waypoints = waypoints
        let region = Self.region(for: waypoints)
        _cameraPosition = State(initialValue: .region(region))
    }

    var body: some View {
        Map(position: $cameraPosition, interactionModes: [.pan, .zoom]) {
            if waypoints.count >= 2 {
                MapPolyline(coordinates: waypoints.map(\.coordinate))
                    .stroke(Color.traceAccent, style: StrokeStyle(
                        lineWidth: 4,
                        lineCap: .round,
                        lineJoin: .round
                    ))
            }
            ForEach(Array(waypoints.enumerated()), id: \.offset) { _, wp in
                if let label = wp.label {
                    Annotation(label, coordinate: wp.coordinate) {
                        WaypointPin(label: label)
                    }
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic))
    }

    private static func region(for waypoints: [Waypoint]) -> MKCoordinateRegion {
        guard !waypoints.isEmpty else {
            return MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 40.7128, longitude: -74.0060),
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            )
        }
        let lats = waypoints.map(\.lat)
        let lngs = waypoints.map(\.lng)
        let minLat = lats.min()!, maxLat = lats.max()!
        let minLng = lngs.min()!, maxLng = lngs.max()!
        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2
        )
        let span = MKCoordinateSpan(
            latitudeDelta: max((maxLat - minLat) * 1.5, 0.01),
            longitudeDelta: max((maxLng - minLng) * 1.5, 0.01)
        )
        return MKCoordinateRegion(center: center, span: span)
    }
}

private struct WaypointPin: View {
    let label: String

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.traceAccent)
                .frame(width: 26, height: 26)
            Circle()
                .stroke(Color.white, lineWidth: 2)
                .frame(width: 26, height: 26)
            Text(label)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
        }
        .shadow(color: .black.opacity(0.25), radius: 3, y: 1)
    }
}
