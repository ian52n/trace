import SwiftUI

extension Color {
    static let traceParchment = Color(red: 0.96, green: 0.94, blue: 0.89)
    static let traceCream = Color(red: 0.985, green: 0.965, blue: 0.93)
    static let traceInk = Color(red: 0.13, green: 0.11, blue: 0.10)
    static let traceMuted = Color(red: 0.42, green: 0.37, blue: 0.32)
    static let traceAccent = Color(red: 0.61, green: 0.26, blue: 0.13)
    static let traceHair = Color(red: 0.78, green: 0.73, blue: 0.65)
}

extension Font {
    static let traceDisplay = Font.system(size: 34, weight: .semibold, design: .serif)
    static let traceTitle = Font.system(size: 26, weight: .semibold, design: .serif)
    static let traceCardTitle = Font.system(size: 22, weight: .semibold, design: .serif)
    static let traceBody = Font.system(size: 17, weight: .regular, design: .serif)
    static let traceSubtitle = Font.system(size: 15, weight: .regular, design: .default)
    static let traceLabel = Font.system(size: 12, weight: .medium, design: .default)
}

struct VibeGradient {
    static func colors(for vibes: [Vibe]) -> [Color] {
        let primary = vibes.first ?? .urban
        switch primary {
        case .historic: return [Color(red: 0.55, green: 0.35, blue: 0.20), Color(red: 0.30, green: 0.18, blue: 0.10)]
        case .nature:   return [Color(red: 0.32, green: 0.50, blue: 0.32), Color(red: 0.12, green: 0.25, blue: 0.15)]
        case .weird:    return [Color(red: 0.45, green: 0.30, blue: 0.55), Color(red: 0.22, green: 0.12, blue: 0.30)]
        case .coffee:   return [Color(red: 0.50, green: 0.32, blue: 0.22), Color(red: 0.28, green: 0.18, blue: 0.12)]
        case .iconic:   return [Color(red: 0.70, green: 0.40, blue: 0.20), Color(red: 0.40, green: 0.20, blue: 0.10)]
        case .hidden:   return [Color(red: 0.30, green: 0.28, blue: 0.32), Color(red: 0.12, green: 0.12, blue: 0.15)]
        case .water:    return [Color(red: 0.25, green: 0.40, blue: 0.55), Color(red: 0.10, green: 0.20, blue: 0.32)]
        case .urban:    return [Color(red: 0.40, green: 0.36, blue: 0.32), Color(red: 0.20, green: 0.18, blue: 0.16)]
        }
    }
}
