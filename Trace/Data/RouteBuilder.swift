import Foundation
import MapKit
import CoreLocation

/// Builds a loop of waypoints through ordered POIs, snapping the polyline
/// between each pair to a real walking route via MKDirections.
/// Falls back to a straight segment if MKDirections has no route for a leg.
/// This can lead to impossible routes and should be fixed in a later version.
enum RouteBuilder {
    static func buildLoop(through pois: [POI]) async -> [Waypoint] {
        guard pois.count >= 2 else {
            return pois.enumerated().map { i, poi in
                Waypoint(
                    lat: poi.coordinate.latitude,
                    lng: poi.coordinate.longitude,
                    label: "\(i + 1)",
                    note: poi.name
                )
            }
        }

        var waypoints: [Waypoint] = []
        for i in 0..<pois.count {
            let from = pois[i]
            let to = pois[(i + 1) % pois.count]

            waypoints.append(Waypoint(
                lat: from.coordinate.latitude,
                lng: from.coordinate.longitude,
                label: "\(i + 1)",
                note: from.name
            ))

            let segment = await walkingRoute(from: from.coordinate, to: to.coordinate)
            // Strip endpoints; the FROM is already added above and the TO will
            // be added on the next iteration (or as the closing point below).
            for idx in segment.indices.dropFirst().dropLast() {
                waypoints.append(Waypoint(
                    lat: segment[idx].latitude,
                    lng: segment[idx].longitude,
                    label: nil,
                    note: nil
                ))
            }
        }

        // Close the polyline back to POI 1.
        if let first = pois.first {
            waypoints.append(Waypoint(
                lat: first.coordinate.latitude,
                lng: first.coordinate.longitude,
                label: nil,
                note: nil
            ))
        }

        return waypoints
    }

    private static func walkingRoute(
        from: CLLocationCoordinate2D,
        to: CLLocationCoordinate2D
    ) async -> [CLLocationCoordinate2D] {
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: from))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: to))
        request.transportType = .walking
        let directions = MKDirections(request: request)
        do {
            let response = try await directions.calculate()
            guard let route = response.routes.first else { return [from, to] }
            let polyline = route.polyline
            let count = polyline.pointCount
            var coords = [CLLocationCoordinate2D](
                repeating: kCLLocationCoordinate2DInvalid,
                count: count
            )
            polyline.getCoordinates(&coords, range: NSRange(location: 0, length: count))
            return coords
        } catch {
            return [from, to]
        }
    }
}
