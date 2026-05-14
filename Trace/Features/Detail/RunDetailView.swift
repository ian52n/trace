import SwiftUI

struct RunDetailView: View {
    let run: Run
    @Environment(RunStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HeroBanner(run: run)
                    .frame(height: 320)
                    .overlay(alignment: .topLeading) {
                        BackButton { dismiss() }
                            .padding(.top, 8)
                            .padding(.leading, 12)
                    }
                    .overlay(alignment: .topTrailing) {
                        SaveButton(
                            isSaved: store.isSaved(run),
                            action: { store.toggleSaved(run) }
                        )
                        .padding(.top, 8)
                        .padding(.trailing, 12)
                    }

                VStack(alignment: .leading, spacing: 22) {
                    titleBlock
                    factsRow
                    Divider().background(Color.traceHair.opacity(0.5))
                    storyBlock
                    mapBlock
                    waypointsBlock
                    postRunBlock
                }
                .padding(.horizontal, 20)
                .padding(.top, 24)
                .padding(.bottom, 60)
            }
        }
        .background(Color.traceParchment.ignoresSafeArea())
        .ignoresSafeArea(edges: .top)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Text(run.locationLine.uppercased())
                if run.isAIGenerated {
                    Text("·")
                    Text("GENERATED FOR YOU")
                        .foregroundStyle(Color.traceAccent)
                }
            }
            .font(.traceLabel)
            .tracking(1.6)
            .foregroundStyle(Color.traceMuted)

            Text(run.title)
                .font(.traceDisplay)
                .foregroundStyle(Color.traceInk)
        }
    }

    private var factsRow: some View {
        HStack(spacing: 18) {
            Fact(big: String(format: "%.1f", run.distanceKm), small: "km")
            if let gain = run.elevationGainM {
                Divider().frame(height: 28).background(Color.traceHair)
                Fact(big: "\(gain)", small: "m gain")
            }
            if let surface = run.surface {
                Divider().frame(height: 28).background(Color.traceHair)
                Fact(big: surface.label, small: "surface")
            }
            Spacer()
        }
    }

    private struct Fact: View {
        let big: String
        let small: String
        var body: some View {
            VStack(alignment: .leading, spacing: 1) {
                Text(big)
                    .font(.system(size: 18, weight: .semibold, design: .serif))
                    .foregroundStyle(Color.traceInk)
                Text(small.uppercased())
                    .font(.traceLabel)
                    .tracking(1.0)
                    .foregroundStyle(Color.traceMuted)
            }
        }
    }

    private var storyBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "The Run")
            Text(run.story)
                .font(.traceBody)
                .foregroundStyle(Color.traceInk)
                .lineSpacing(6)
                .fixedSize(horizontal: false, vertical: true)
            Text(run.bestTime.label.capitalized + ".")
                .font(.traceSubtitle.italic())
                .foregroundStyle(Color.traceMuted)
                .padding(.top, 4)
        }
    }

    private var mapBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "The Route")
            RouteMapView(waypoints: run.waypoints)
                .frame(height: 260)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.traceHair.opacity(0.6), lineWidth: 0.5)
                )
        }
    }

    private var waypointsBlock: some View {
        let labeled = run.waypoints.filter { $0.label != nil || $0.note != nil }
        return Group {
            if !labeled.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    SectionLabel(text: "What You'll Pass")
                    VStack(alignment: .leading, spacing: 14) {
                        ForEach(Array(labeled.enumerated()), id: \.offset) { _, wp in
                            HStack(alignment: .top, spacing: 12) {
                                ZStack {
                                    Circle().fill(Color.traceAccent).frame(width: 22, height: 22)
                                    Text(wp.label ?? "•")
                                        .font(.system(size: 10, weight: .bold, design: .rounded))
                                        .foregroundStyle(.white)
                                }
                                Text(wp.note ?? "")
                                    .font(.traceBody)
                                    .foregroundStyle(Color.traceInk)
                                Spacer()
                            }
                        }
                    }
                }
            }
        }
    }

    private var postRunBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "The Post-Run Move")
            Text(run.postRunMove)
                .font(.traceBody)
                .foregroundStyle(Color.traceInk)
                .lineSpacing(5)
                .fixedSize(horizontal: false, vertical: true)
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.traceCream)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.traceHair.opacity(0.5), lineWidth: 0.5)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

private struct SectionLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.traceLabel)
            .tracking(2.4)
            .foregroundStyle(Color.traceMuted)
    }
}

private struct BackButton: View {
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: "chevron.left")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 38, height: 38)
                .background(.black.opacity(0.32))
                .clipShape(Circle())
        }
    }
}

private struct SaveButton: View {
    let isSaved: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: isSaved ? "heart.fill" : "heart")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(isSaved ? Color.traceAccent : .white)
                .frame(width: 38, height: 38)
                .background(.black.opacity(0.32))
                .clipShape(Circle())
        }
    }
}

#Preview {
    let store = RunStore()
    return NavigationStack {
        if let run = store.curated.first {
            RunDetailView(run: run).environment(store)
        }
    }
}
