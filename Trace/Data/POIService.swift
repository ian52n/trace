import Foundation
import MapKit
import CoreLocation

struct POI: Hashable {
    let name: String
    let coordinate: CLLocationCoordinate2D
    let category: String?

    func hash(into hasher: inout Hasher) {
        hasher.combine(name)
        hasher.combine(coordinate.latitude)
        hasher.combine(coordinate.longitude)
    }

    static func == (lhs: POI, rhs: POI) -> Bool {
        lhs.name == rhs.name &&
        lhs.coordinate.latitude == rhs.coordinate.latitude &&
        lhs.coordinate.longitude == rhs.coordinate.longitude
    }
}

enum POIService {
    // Tier 1: tightly vibe-specific. Best content; lowest hit rate in sparse areas.
    private static let primaryQueries: [Vibe: [String]] = [
        .historic: ["historic site", "monument", "memorial", "old church"],
        .nature:   ["park", "garden", "trail", "waterfront"],
        .weird:    ["museum", "statue", "art gallery", "unusual landmark"],
        .coffee:   ["cafe", "coffee shop", "bakery"],
    ]

    // Tier 2: same vibe, broader vocabulary. Still on-theme.
    private static let secondaryQueries: [Vibe: [String]] = [
        .historic: ["church", "cemetery", "old building", "town square", "ruins", "historic district"],
        .nature:   ["lake", "viewpoint", "forest", "summit", "river", "trailhead", "garden", "creek"],
        .weird:    ["scenic spot", "monument", "attraction", "viewpoint", "tower", "fountain", "plaza"],
        .coffee:   ["market", "restaurant", "patisserie", "deli", "tea house", "bookstore"],
    ]

    // Tier 3: vibe abandoned. Pulls from across vibes — anything a runner might pass.
    private static let crossVibeQueries = [
        "park", "trail", "landmark", "monument", "museum", "viewpoint",
        "scenic spot", "historic site", "garden", "church", "library",
        "lake", "river", "bridge", "plaza", "fountain"
    ]

    // Tier 4: maximum desperation. Generic + expanded radius.
    private static let anythingGoesQueries = [
        "point of interest", "park", "trail", "landmark", "school",
        "library", "church", "store", "restaurant", "post office"
    ]

    private static let tier4RadiusMultiplier: Double = 1.5

    /// How many POIs we need before we'll stop escalating tiers.
    /// Short runs are fine with 3 stops; long runs need more or the legs sprawl.
    static func minimumPOIs(forDistanceKm distanceKm: Double) -> Int {
        let scaled = Int((distanceKm / 2.5).rounded())
        return min(max(3, scaled), 8)
    }

    static func findPOIs(
        around center: CLLocationCoordinate2D,
        targetDistanceKm: Double,
        vibe: Vibe,
        limit: Int? = nil
    ) async -> [POI] {
        let baseRadius = max((targetDistanceKm * 1000) / .pi, 800)
        let minPOIs = minimumPOIs(forDistanceKm: targetDistanceKm)
        let actualLimit = limit ?? 30

        let tiers: [(queries: [String], radius: CLLocationDistance)] = [
            (primaryQueries[vibe] ?? [], baseRadius),
            (secondaryQueries[vibe] ?? [], baseRadius),
            (crossVibeQueries, baseRadius),
            (anythingGoesQueries, baseRadius * tier4RadiusMultiplier),
        ]

        var collected: [MKMapItem] = []
        for tier in tiers {
            if uniqueCount(collected) >= minPOIs { break }
            let items = await runQueries(tier.queries, center: center, radiusMeters: tier.radius)
            collected.append(contentsOf: items)
        }

        return dedupeAndRank(
            collected,
            center: center,
            maxRadiusMeters: baseRadius * tier4RadiusMultiplier,
            limit: actualLimit
        )
    }

    /// Picks ~`desiredCount` POIs spread angularly around `pin`, prioritising
    /// candidates near `targetRadiusKm` so the resulting loop is close to the
    /// requested distance. Falls back to relaxing the angular separation if
    /// strict spreading yields fewer than 3 candidates (e.g. POIs all on one
    /// side of the pin due to water or city boundary).
    static func selectSpreadByAngle(
        pois: [POI],
        around pin: CLLocationCoordinate2D,
        targetRadiusKm: Double,
        desiredCount: Int
    ) -> [POI] {
        guard !pois.isEmpty else { return [] }

        let scored: [Scored] = pois.map { poi in
            let angle = bearingDegrees(from: pin, to: poi.coordinate)
            let distKm = distance(pin, poi.coordinate) / 1000
            return Scored(poi: poi, angle: angle, radialScore: abs(distKm - targetRadiusKm))
        }
        let sortedByFit = scored.sorted { $0.radialScore < $1.radialScore }

        let strictSeparation = max(20.0, (360.0 / Double(desiredCount)) * 0.6)
        var selected = pick(from: sortedByFit, separation: strictSeparation, limit: desiredCount)

        // If strict spreading missed too many (e.g. lopsided POI distribution),
        // relax the separation requirement and top up.
        if selected.count < min(desiredCount, sortedByFit.count) {
            let relaxed = pick(from: sortedByFit, separation: strictSeparation / 2, limit: desiredCount)
            if relaxed.count > selected.count { selected = relaxed }
        }

        return selected.map(\.poi)
    }

    private static func pick(
        from candidates: [Scored],
        separation: Double,
        limit: Int
    ) -> [Scored] {
        var selected: [Scored] = []
        for cand in candidates {
            if selected.count >= limit { break }
            let tooClose = selected.contains { sel in
                angularDistance(cand.angle, sel.angle) < separation
            }
            if !tooClose { selected.append(cand) }
        }
        return selected
    }

    /// Wraps the angle-scored POI in a private struct visible to `pick`.
    private struct Scored {
        let poi: POI
        let angle: Double
        let radialScore: Double
    }

    static func nearestNeighborOrder(
        pois: [POI],
        startingFrom start: CLLocationCoordinate2D
    ) -> [POI] {
        var remaining = pois
        var ordered: [POI] = []
        var current = start
        while !remaining.isEmpty {
            let nearestIdx = remaining.indices.min { i, j in
                distance(current, remaining[i].coordinate) <
                distance(current, remaining[j].coordinate)
            }!
            let next = remaining.remove(at: nearestIdx)
            ordered.append(next)
            current = next.coordinate
        }
        return ordered
    }

    private static func runQueries(
        _ queries: [String],
        center: CLLocationCoordinate2D,
        radiusMeters: CLLocationDistance
    ) async -> [MKMapItem] {
        guard !queries.isEmpty else { return [] }
        return await withTaskGroup(of: [MKMapItem].self) { group in
            for query in queries {
                group.addTask {
                    await search(query: query, center: center, radiusMeters: radiusMeters)
                }
            }
            var items: [MKMapItem] = []
            for await result in group {
                items.append(contentsOf: result)
            }
            return items
        }
    }

    private static func search(
        query: String,
        center: CLLocationCoordinate2D,
        radiusMeters: CLLocationDistance
    ) async -> [MKMapItem] {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.region = MKCoordinateRegion(
            center: center,
            latitudinalMeters: radiusMeters * 2,
            longitudinalMeters: radiusMeters * 2
        )
        request.resultTypes = .pointOfInterest
        let search = MKLocalSearch(request: request)
        do {
            let response = try await search.start()
            return response.mapItems
        } catch {
            return []
        }
    }

    private static func uniqueCount(_ items: [MKMapItem]) -> Int {
        var seen = Set<String>()
        for item in items {
            let key = (item.name ?? "").lowercased()
            if !key.isEmpty { seen.insert(key) }
        }
        return seen.count
    }

    private static func dedupeAndRank(
        _ items: [MKMapItem],
        center: CLLocationCoordinate2D,
        maxRadiusMeters: CLLocationDistance,
        limit: Int
    ) -> [POI] {
        let centerLoc = CLLocation(latitude: center.latitude, longitude: center.longitude)
        let sortedByDistance = items.sorted { a, b in
            distance(from: centerLoc, to: a.placemark.coordinate) <
            distance(from: centerLoc, to: b.placemark.coordinate)
        }
        var seen = Set<String>()
        var pois: [POI] = []
        for item in sortedByDistance {
            let name = item.name ?? ""
            let key = name.lowercased()
            guard !name.isEmpty, !seen.contains(key) else { continue }
            guard distance(from: centerLoc, to: item.placemark.coordinate) <= maxRadiusMeters else { continue }
            seen.insert(key)
            pois.append(POI(
                name: name,
                coordinate: item.placemark.coordinate,
                category: item.pointOfInterestCategory?.rawValue
            ))
            if pois.count >= limit { break }
        }
        return pois
    }

    private static func distance(from loc: CLLocation, to coord: CLLocationCoordinate2D) -> CLLocationDistance {
        loc.distance(from: CLLocation(latitude: coord.latitude, longitude: coord.longitude))
    }

    private static func distance(_ a: CLLocationCoordinate2D, _ b: CLLocationCoordinate2D) -> CLLocationDistance {
        CLLocation(latitude: a.latitude, longitude: a.longitude)
            .distance(from: CLLocation(latitude: b.latitude, longitude: b.longitude))
    }

    /// Initial bearing from `a` to `b`, in degrees 0..360 (0 = north, 90 = east).
    private static func bearingDegrees(
        from a: CLLocationCoordinate2D,
        to b: CLLocationCoordinate2D
    ) -> Double {
        let lat1 = a.latitude * .pi / 180
        let lat2 = b.latitude * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let y = sin(dLon) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        let bearing = atan2(y, x) * 180 / .pi
        return (bearing + 360).truncatingRemainder(dividingBy: 360)
    }

    /// Smallest difference between two angles in degrees, 0..180.
    private static func angularDistance(_ a: Double, _ b: Double) -> Double {
        let raw = abs(a - b).truncatingRemainder(dividingBy: 360)
        return min(raw, 360 - raw)
    }
}
