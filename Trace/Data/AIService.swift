import Foundation
import CoreLocation

struct GenerateRequest {
    let center: CLLocationCoordinate2D
    let cityHint: String?
    let distanceKm: Double
    let vibe: Vibe
}

enum GenerationStage {
    case searching   // finding nearby POIs
    case routing     // building the walking polyline
    case writing     // calling the LLM
}

protocol AIService {
    func generateRun(
        _ request: GenerateRequest,
        onProgress: @escaping @Sendable (GenerationStage) -> Void
    ) async throws -> Run
}

enum AIServiceError: Error {
    case noNearbyPlaces
    case networkFailed(Error)
    case decodeFailed
}

// Fallback implementation used when no Worker URL is configured (Config.swift).
// Returns hand-written templates so the demo runs offline. The real service
// is ClaudeAIService.swift; the selection happens in AIServiceFactory.
final class MockAIService: AIService {
    func generateRun(
        _ request: GenerateRequest,
        onProgress: @escaping @Sendable (GenerationStage) -> Void
    ) async throws -> Run {
        onProgress(.searching)
        try await Task.sleep(for: .milliseconds(600))
        onProgress(.routing)
        try await Task.sleep(for: .milliseconds(600))
        onProgress(.writing)
        try await Task.sleep(for: .milliseconds(900))
        return Self.template(for: request)
    }

    private static func template(for request: GenerateRequest) -> Run {
        let waypoints = RouteGeometry.circularLoop(
            around: request.center,
            distanceKm: request.distanceKm,
            stops: 8
        )
        let copy = copy(for: request.vibe)
        return Run(
            title: copy.title,
            city: request.cityHint ?? "Near you",
            country: request.cityHint == nil ? "—" : "",
            distanceKm: waypoints.polylineDistanceKm,
            elevationGainM: nil,
            surface: nil,
            vibes: [request.vibe],
            bestTime: .dawn,
            hook: copy.hook,
            story: copy.story,
            waypoints: waypoints,
            postRunMove: copy.postRun,
            heroImageURL: nil,
            isAIGenerated: true
        )
    }

    private struct Copy {
        let title: String
        let hook: String
        let story: String
        let postRun: String
    }

    private static func copy(for vibe: Vibe) -> Copy {
        switch vibe {
        case .historic:
            return Copy(
                title: "The Old Walls Circuit",
                hook: "Trace the city's first edges, where stone gives way to streetlight.",
                story: """
                Every city has a version of this run, and the trick is finding it before anyone else is awake. Start where the morning bakers are stacking trays in the dark — you'll hear them before you see them, the metallic clatter, the smell of yeast that hasn't yet become bread.

                The route follows what used to be a wall. You can feel it in the streets, the way they curve where stone once turned. Whatever was inside the wall is now neighborhoods that have been arguing about parking for two hundred years. Whatever was outside is now neighborhoods that pretend they were always inside.

                Halfway through, the city does that thing cities do: it shows you something it forgot to hide. A staircase that goes nowhere. A door without a building. Keep moving. You'll come back later, slower, with coffee.
                """,
                postRun: "Find the cafe with the most regulars at 8am and order whatever they're having. Don't ask for the menu."
            )
        case .nature:
            return Copy(
                title: "The Quiet Green Loop",
                hook: "Slip out before the city wakes and the park belongs to you and a few serious dogs.",
                story: """
                There's a particular kind of light that only exists in city parks before 7am. The grass is wet in a way that means business. The runners you pass nod at each other in the way of people who have agreed, without speaking, that this is the correct way to live.

                Find the dirt path, not the paved one. The dirt path is where the locals run, and there's always a reason: it's softer, it's prettier, or it knows a shortcut. Sometimes all three.

                Toward the end you'll pass a stand of trees that the city, somehow, has not yet ruined. Run slower through here. This is the part you'll remember next week, when you're back in your hotel, trying to decide if you liked this place.
                """,
                postRun: "There's a farmer's market within 800 meters. Buy a peach. Eat it now, not later."
            )
        case .weird:
            return Copy(
                title: "The Run That Doesn't Quite Make Sense",
                hook: "Every city has a route that doesn't appear in any guidebook. This is yours.",
                story: """
                This run was built around three things you weren't planning to see. A statue of someone the city has clearly forgotten. A building that appears to have been designed by two different architects who weren't speaking. A small park named after an animal that doesn't live on this continent.

                The route connects them in roughly the right order, and the distances between them are not what you'd expect. That's the point. Atlas Obscura calls this "the sweet spot between lost and found," which is generous, because it mostly feels like lost.

                Bring water. The most interesting parts of any city are usually uphill, and they don't tell you that until you're already running.
                """,
                postRun: "There's a bar somewhere on this route that opens at 11am and serves one thing well. Find it. Don't post about it."
            )
        case .coffee:
            return Copy(
                title: "The Cortado Route",
                hook: "A run organized entirely around its ending.",
                story: """
                Some runs are about the running. This one is about the espresso at the end. The route is shaped, very intentionally, to drop you at the door of a place where the barista takes their work seriously and the regulars don't look up when you come in.

                You'll run past three other coffee shops on the way. Ignore them. They are fine. The one you're going to is the one with the small queue outside at 7:45am, which is the city's tell that something is happening here.

                Pace yourself. The reward at the end is small and intense, and you want to deserve it.
                """,
                postRun: "Order whatever the person ahead of you ordered. Stand at the bar. Don't take it to go."
            )
        default:
            return Copy(
                title: "A Run, Specifically Here",
                hook: "A loop calibrated to this exact pin on the map.",
                story: """
                This is a loop the algorithm built around where you're standing. It's not famous. Locals don't have a name for it. But it threads through a few places that, when you string them together, start to feel like a route.

                Run it slowly the first time. The second time you'll know which corners to take wide and which streetlight to use as a halfway mark.
                """,
                postRun: "Find the closest place that's open and walk in like you've been here before."
            )
        }
    }
}
