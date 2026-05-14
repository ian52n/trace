import Foundation
import CoreLocation

final class ClaudeAIService: AIService {
    private let workerURL: URL
    private let session: URLSession

    init(workerURL: URL, session: URLSession = .shared) {
        self.workerURL = workerURL
        self.session = session
    }

    func generateRun(
        _ request: GenerateRequest,
        onProgress: @escaping @Sendable (GenerationStage) -> Void
    ) async throws -> Run {
        onProgress(.searching)
        let candidates = await POIService.findPOIs(
            around: request.center,
            targetDistanceKm: request.distanceKm,
            vibe: request.vibe,
            limit: 30
        )

        onProgress(.routing)
        let (waypoints, visitedPOIs) = await buildBestLoop(
            request: request,
            candidates: candidates
        )

        let actualDistanceKm = waypoints.polylineDistanceKm
        let poisWithRhythm = cumulativeDistancesAtPOIs(waypoints: waypoints)

        onProgress(.writing)
        let decoded = try await callWorker(
            request: request,
            actualDistanceKm: actualDistanceKm,
            pois: poisWithRhythm,
            anyPOIsActuallyVisited: !visitedPOIs.isEmpty
        )

        return Run(
            title: decoded.title,
            city: request.cityHint ?? "Near you",
            country: request.cityHint == nil ? "—" : "",
            distanceKm: actualDistanceKm,
            elevationGainM: nil,
            surface: nil,
            vibes: [request.vibe],
            bestTime: .dawn,
            hook: decoded.hook,
            story: decoded.story,
            waypoints: waypoints,
            postRunMove: decoded.postRunMove,
            heroImageURL: nil,
            isAIGenerated: true
        )
    }

    /// Selects POIs spread around the pin at a radius matching the requested
    /// distance, builds a walking route, and refines once if the result is far
    /// off the target. Returns the final waypoints and the POIs actually used.
    private func buildBestLoop(
        request: GenerateRequest,
        candidates: [POI]
    ) async -> (waypoints: [Waypoint], visited: [POI]) {
        guard candidates.count >= 3 else {
            return (RouteGeometry.circularLoop(
                around: request.center,
                distanceKm: request.distanceKm,
                stops: 8
            ), [])
        }

        // Target straight-line radius for a circular tour of the requested
        // length, deflated for the typical 1.3x walking-vs-straight-line ratio.
        let walkingFactor = 1.3
        var targetRadiusKm = (request.distanceKm / (2 * .pi)) / walkingFactor
        var desiredCount = POIService.minimumPOIs(forDistanceKm: request.distanceKm) + 1

        var selected = POIService.selectSpreadByAngle(
            pois: candidates,
            around: request.center,
            targetRadiusKm: targetRadiusKm,
            desiredCount: desiredCount
        )

        guard selected.count >= 3 else {
            // Couldn't spread enough — try the closest N regardless of angle.
            let fallback = Array(candidates.prefix(max(3, desiredCount)))
            let ordered = POIService.nearestNeighborOrder(pois: fallback, startingFrom: request.center)
            let waypoints = await RouteBuilder.buildLoop(through: ordered)
            return (waypoints, ordered)
        }

        var ordered = POIService.nearestNeighborOrder(pois: selected, startingFrom: request.center)
        var waypoints = await RouteBuilder.buildLoop(through: ordered)
        var actualKm = waypoints.polylineDistanceKm

        // One refinement attempt when the first pass is well off target.
        let ratio = actualKm / request.distanceKm
        if ratio < 0.7 {
            targetRadiusKm *= 1.5
            desiredCount = min(desiredCount + 1, 10)
        } else if ratio > 1.5 {
            targetRadiusKm /= 1.4
            desiredCount = max(desiredCount - 1, 3)
        } else {
            return (waypoints, ordered)
        }

        let retry = POIService.selectSpreadByAngle(
            pois: candidates,
            around: request.center,
            targetRadiusKm: targetRadiusKm,
            desiredCount: desiredCount
        )
        if retry.count >= 3 {
            let retryOrdered = POIService.nearestNeighborOrder(pois: retry, startingFrom: request.center)
            let retryWaypoints = await RouteBuilder.buildLoop(through: retryOrdered)
            let retryKm = retryWaypoints.polylineDistanceKm
            // Keep the closer-to-target result.
            if abs(retryKm - request.distanceKm) < abs(actualKm - request.distanceKm) {
                ordered = retryOrdered
                waypoints = retryWaypoints
                actualKm = retryKm
            }
        }
        return (waypoints, ordered)
    }

    /// Returns each labelled POI in the waypoint sequence paired with its
    /// cumulative distance from the start of the loop, in km.
    private func cumulativeDistancesAtPOIs(waypoints: [Waypoint]) -> [POIWithRhythm] {
        var result: [POIWithRhythm] = []
        var cumulative: CLLocationDistance = 0
        for i in waypoints.indices {
            if i > 0 {
                let a = CLLocation(latitude: waypoints[i - 1].lat, longitude: waypoints[i - 1].lng)
                let b = CLLocation(latitude: waypoints[i].lat, longitude: waypoints[i].lng)
                cumulative += a.distance(from: b)
            }
            if let name = waypoints[i].note {
                result.append(POIWithRhythm(
                    name: name,
                    lat: waypoints[i].lat,
                    lng: waypoints[i].lng,
                    distFromStartKm: cumulative / 1000
                ))
            }
        }
        return result
    }

    private func callWorker(
        request: GenerateRequest,
        actualDistanceKm: Double,
        pois: [POIWithRhythm],
        anyPOIsActuallyVisited: Bool
    ) async throws -> WorkerResponse {
        var req = URLRequest(url: workerURL)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(WorkerBody(
            lat: request.center.latitude,
            lng: request.center.longitude,
            distanceKm: actualDistanceKm,
            vibe: request.vibe.rawValue,
            cityHint: request.cityHint,
            pois: anyPOIsActuallyVisited ? pois : []
        ))
        req.timeoutInterval = 45

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw AIServiceError.networkFailed(error)
        }
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "(no body)"
            throw AIServiceError.networkFailed(
                NSError(
                    domain: "ClaudeAIService",
                    code: (response as? HTTPURLResponse)?.statusCode ?? -1,
                    userInfo: [NSLocalizedDescriptionKey: body]
                )
            )
        }
        do {
            return try JSONDecoder().decode(WorkerResponse.self, from: data)
        } catch {
            throw AIServiceError.decodeFailed
        }
    }

    private struct POIWithRhythm: Encodable {
        let name: String
        let lat: Double
        let lng: Double
        let distFromStartKm: Double
    }

    private struct WorkerBody: Encodable {
        let lat: Double
        let lng: Double
        let distanceKm: Double
        let vibe: String
        let cityHint: String?
        let pois: [POIWithRhythm]
    }

    private struct WorkerResponse: Decodable {
        let title: String
        let hook: String
        let story: String
        let postRunMove: String
    }
}

enum RouteGeometry {
    static func circularLoop(
        around center: CLLocationCoordinate2D,
        distanceKm: Double,
        stops: Int
    ) -> [Waypoint] {
        let radiusKm = distanceKm / (2 * .pi)
        let metersPerDegreeLat = 111.0
        let metersPerDegreeLng = 111.0 * cos(center.latitude * .pi / 180)
        return (0...stops).map { i -> Waypoint in
            let theta = Double(i) / Double(stops) * 2 * .pi
            let dLat = (radiusKm / metersPerDegreeLat) * cos(theta)
            let dLng = (radiusKm / metersPerDegreeLng) * sin(theta)
            return Waypoint(
                lat: center.latitude + dLat,
                lng: center.longitude + dLng,
                label: nil,
                note: nil
            )
        }
    }
}
