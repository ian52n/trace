import SwiftUI

struct RunCard: View {
    let run: Run

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HeroBanner(run: run)
                .frame(height: 200)
                .clipShape(UnevenRoundedRectangle(cornerRadii: .init(topLeading: 14, topTrailing: 14)))

            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Text(run.city.uppercased())
                    Text("·")
                    Text(run.country.uppercased())
                    if run.isAIGenerated {
                        Spacer()
                        GeneratedChip()
                    }
                }
                .font(.traceLabel)
                .foregroundStyle(Color.traceMuted)
                .tracking(1.4)

                Text(run.title)
                    .font(.traceCardTitle)
                    .foregroundStyle(Color.traceInk)
                    .lineLimit(2)

                Text(run.hook)
                    .font(.traceBody)
                    .foregroundStyle(Color.traceMuted)
                    .lineLimit(2)
                    .padding(.bottom, 2)

                HStack(spacing: 12) {
                    Stat(value: String(format: "%.1f km", run.distanceKm))
                    if let gain = run.elevationGainM {
                        Stat(value: "↑ \(gain) m")
                    }
                    if let surface = run.surface {
                        Stat(value: surface.label)
                    }
                    Spacer()
                }
            }
            .padding(16)
            .background(Color.traceCream)
            .clipShape(UnevenRoundedRectangle(cornerRadii: .init(bottomLeading: 14, bottomTrailing: 14)))
        }
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.traceHair.opacity(0.5), lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.06), radius: 8, y: 4)
    }

    private struct Stat: View {
        let value: String
        var body: some View {
            Text(value)
                .font(.traceLabel)
                .foregroundStyle(Color.traceMuted)
        }
    }
}

struct HeroBanner: View {
    let run: Run

    var body: some View {
        ZStack {
            if let url = run.heroImageURL {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        gradient
                    }
                }
            } else {
                gradient
            }

            LinearGradient(
                colors: [.black.opacity(0.0), .black.opacity(0.35)],
                startPoint: .top,
                endPoint: .bottom
            )

            VStack {
                Spacer()
                HStack(spacing: 6) {
                    ForEach(run.vibes.prefix(3), id: \.self) { vibe in
                        VibePill(vibe: vibe)
                    }
                    Spacer()
                    Text(run.bestTime.label)
                        .font(.traceLabel)
                        .foregroundStyle(.white.opacity(0.92))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(.black.opacity(0.28))
                        .clipShape(Capsule())
                }
                .padding(14)
            }
        }
        .clipped()
    }

    private var gradient: some View {
        LinearGradient(
            colors: VibeGradient.colors(for: run.vibes),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            Image(systemName: (run.vibes.first ?? .urban).symbol)
                .font(.system(size: 90, weight: .light))
                .foregroundStyle(.white.opacity(0.10))
                .offset(x: 80, y: -30)
        )
    }
}

struct VibePill: View {
    let vibe: Vibe
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: vibe.symbol)
                .font(.system(size: 10, weight: .semibold))
            Text(vibe.label)
                .font(.traceLabel)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(.black.opacity(0.32))
        .clipShape(Capsule())
    }
}

struct GeneratedChip: View {
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "sparkles")
                .font(.system(size: 10, weight: .semibold))
            Text("GENERATED")
        }
        .font(.traceLabel)
        .foregroundStyle(Color.traceAccent)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.traceAccent.opacity(0.08))
        .clipShape(Capsule())
        .overlay(
            Capsule().stroke(Color.traceAccent.opacity(0.4), lineWidth: 0.5)
        )
    }
}

#Preview {
    let store = RunStore()
    return ScrollView {
        VStack(spacing: 16) {
            ForEach(store.curated) { run in
                RunCard(run: run)
                    .padding(.horizontal, 16)
            }
        }
        .padding(.vertical, 16)
    }
    .background(Color.traceParchment)
}
