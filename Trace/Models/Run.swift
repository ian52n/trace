import Foundation
import CoreLocation

struct Run: Identifiable, Codable, Hashable {
    let id: UUID
    let title: String
    let city: String
    let country: String
    let distanceKm: Double
    let elevationGainM: Int?
    let surface: Surface?
    let vibes: [Vibe]
    let bestTime: BestTime
    let hook: String
    let story: String
    let waypoints: [Waypoint]
    let postRunMove: String
    let heroImageURL: URL?
    let isAIGenerated: Bool
    let createdAt: Date

    init(
        id: UUID = UUID(),
        title: String,
        city: String,
        country: String,
        distanceKm: Double,
        elevationGainM: Int?,
        surface: Surface?,
        vibes: [Vibe],
        bestTime: BestTime,
        hook: String,
        story: String,
        waypoints: [Waypoint],
        postRunMove: String,
        heroImageURL: URL? = nil,
        isAIGenerated: Bool = false,
        createdAt: Date = .now
    ) {
        self.id = id
        self.title = title
        self.city = city
        self.country = country
        self.distanceKm = distanceKm
        self.elevationGainM = elevationGainM
        self.surface = surface
        self.vibes = vibes
        self.bestTime = bestTime
        self.hook = hook
        self.story = story
        self.waypoints = waypoints
        self.postRunMove = postRunMove
        self.heroImageURL = heroImageURL
        self.isAIGenerated = isAIGenerated
        self.createdAt = createdAt
    }

    var locationLine: String { "\(city), \(country)" }

    var coordinates: [CLLocationCoordinate2D] {
        waypoints.map(\.coordinate)
    }
}

extension Array where Element == Waypoint {
    /// Sum of haversine distances between consecutive waypoints, in km.
    var polylineDistanceKm: Double {
        guard count > 1 else { return 0 }
        var total: CLLocationDistance = 0
        for i in 0..<(count - 1) {
            let a = CLLocation(latitude: self[i].lat, longitude: self[i].lng)
            let b = CLLocation(latitude: self[i + 1].lat, longitude: self[i + 1].lng)
            total += a.distance(from: b)
        }
        return total / 1000
    }
}

struct Waypoint: Codable, Hashable {
    let lat: Double
    let lng: Double
    let label: String?
    let note: String?

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }
}

enum Surface: String, Codable, CaseIterable, Hashable {
    case road, trail, mixed, track

    var label: String {
        switch self {
        case .road: "road"
        case .trail: "trail"
        case .mixed: "mixed"
        case .track: "track"
        }
    }
}

enum Vibe: String, Codable, CaseIterable, Hashable, Identifiable {
    case historic, nature, weird, coffee, iconic, hidden, water, urban

    var id: String { rawValue }
    var label: String { rawValue.capitalized }

    var symbol: String {
        switch self {
        case .historic: "building.columns"
        case .nature: "leaf"
        case .weird: "sparkle"
        case .coffee: "cup.and.saucer"
        case .iconic: "star"
        case .hidden: "magnifyingglass"
        case .water: "drop"
        case .urban: "building.2"
        }
    }
}

enum BestTime: String, Codable, CaseIterable, Hashable {
    case dawn, morning, midday, evening, anytime

    var label: String {
        switch self {
        case .dawn: "best at dawn"
        case .morning: "best in the morning"
        case .midday: "best at midday"
        case .evening: "best at golden hour"
        case .anytime: "anytime"
        }
    }
}
