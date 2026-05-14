import SwiftUI

struct DiscoverView: View {
    @Environment(RunStore.self) private var store
    @State private var showSavedOnly = false

    private var runs: [Run] {
        showSavedOnly ? store.savedRuns() : store.allRuns
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    Header(showSavedOnly: $showSavedOnly,
                           savedCount: store.savedIDs.count)
                        .padding(.horizontal, 16)
                        .padding(.top, 4)

                    if runs.isEmpty {
                        EmptyState(showingSaved: showSavedOnly)
                            .padding(.top, 60)
                    } else {
                        ForEach(runs) { run in
                            NavigationLink(value: run) {
                                RunCard(run: run)
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 16)
                        }
                    }
                }
                .padding(.bottom, 40)
            }
            .background(Color.traceParchment.ignoresSafeArea())
            .navigationDestination(for: Run.self) { run in
                RunDetailView(run: run)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private struct Header: View {
        @Binding var showSavedOnly: Bool
        let savedCount: Int

        var body: some View {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("TRACE")
                        .font(.traceLabel)
                        .tracking(3)
                        .foregroundStyle(Color.traceAccent)
                    Text("Runs as destinations.")
                        .font(.traceDisplay)
                        .foregroundStyle(Color.traceInk)
                    Text("A small atlas of runs worth traveling for.")
                        .font(.traceSubtitle)
                        .foregroundStyle(Color.traceMuted)
                }
                .padding(.top, 18)

                HStack(spacing: 8) {
                    FilterChip(
                        label: "All",
                        isActive: !showSavedOnly,
                        action: { showSavedOnly = false }
                    )
                    FilterChip(
                        label: savedCount > 0 ? "Saved · \(savedCount)" : "Saved",
                        symbol: "heart.fill",
                        isActive: showSavedOnly,
                        action: { showSavedOnly = true }
                    )
                    Spacer()
                }
                .padding(.bottom, 4)
            }
        }
    }

    private struct FilterChip: View {
        let label: String
        var symbol: String? = nil
        let isActive: Bool
        let action: () -> Void

        var body: some View {
            Button(action: action) {
                HStack(spacing: 6) {
                    if let symbol {
                        Image(systemName: symbol)
                            .font(.system(size: 11, weight: .semibold))
                    }
                    Text(label)
                        .font(.traceLabel)
                        .tracking(0.5)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isActive ? Color.traceInk : Color.traceCream)
                .foregroundStyle(isActive ? Color.traceCream : Color.traceInk)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(Color.traceHair.opacity(isActive ? 0 : 0.6), lineWidth: 0.5)
                )
            }
            .buttonStyle(.plain)
        }
    }

    private struct EmptyState: View {
        let showingSaved: Bool
        var body: some View {
            VStack(spacing: 10) {
                Image(systemName: showingSaved ? "heart" : "map")
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(Color.traceMuted.opacity(0.6))
                Text(showingSaved ? "No saved runs yet" : "No runs yet")
                    .font(.traceCardTitle)
                    .foregroundStyle(Color.traceInk)
                Text(showingSaved
                     ? "Tap the heart on any run to keep it here."
                     : "Generate a run from the Generate tab.")
                    .font(.traceSubtitle)
                    .foregroundStyle(Color.traceMuted)
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 40)
            .multilineTextAlignment(.center)
        }
    }
}

#Preview {
    DiscoverView().environment(RunStore())
}
