import SwiftUI
import MapKit
import CoreLocation

struct GenerateView: View {
    @Environment(RunStore.self) private var store

    @State private var cameraPosition: MapCameraPosition = .region(.defaultRegion)
    @State private var pinCoordinate: CLLocationCoordinate2D = .defaultPin
    @State private var distance: Double = 8
    @State private var vibe: Vibe = .historic
    @State private var isGenerating = false
    @State private var generated: Run?
    @State private var showResult = false
    @State private var stage: GenerationStage = .searching

    private let service: AIService = AIServiceFactory.make()
    private let distanceOptions: [Double] = [5, 8, 12, 16, 21]
    private let vibeOptions: [Vibe] = [.historic, .nature, .weird, .coffee]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    mapBlock
                    inputs
                    generateButton
                    footnote
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 60)
            }
            .background(Color.traceParchment.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(isPresented: $showResult) {
                if let run = generated {
                    RunDetailView(run: run).environment(store)
                }
            }
            .overlay {
                if isGenerating {
                    GeneratingOverlay(vibe: vibe, stage: stage)
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("GENERATE")
                .font(.traceLabel)
                .tracking(3)
                .foregroundStyle(Color.traceAccent)
                .padding(.top, 18)
            Text("Build a run from where you are.")
                .font(.traceDisplay)
                .foregroundStyle(Color.traceInk)
            Text("Drop a pin. Pick a distance and a feeling. We'll write the rest.")
                .font(.traceSubtitle)
                .foregroundStyle(Color.traceMuted)
        }
    }

    private var mapBlock: some View {
        ZStack {
            Map(position: $cameraPosition) {
                Annotation("Start", coordinate: pinCoordinate) {
                    ZStack {
                        Circle().fill(Color.traceAccent).frame(width: 22, height: 22)
                        Circle().stroke(.white, lineWidth: 3).frame(width: 22, height: 22)
                    }
                    .shadow(color: .black.opacity(0.3), radius: 4, y: 2)
                }
            }
            .onMapCameraChange { ctx in
                pinCoordinate = ctx.region.center
            }
            // Crosshair stays centered; pin tracks camera center.
            Image(systemName: "plus")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Color.traceAccent.opacity(0.85))
                .clipShape(Circle())
                .allowsHitTesting(false)
        }
        .frame(height: 260)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.traceHair.opacity(0.6), lineWidth: 0.5)
        )
    }

    private var inputs: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 10) {
                Label2("Distance")
                HStack(spacing: 8) {
                    ForEach(distanceOptions, id: \.self) { d in
                        Chip(
                            label: "\(Int(d)) km",
                            isActive: distance == d,
                            action: { distance = d }
                        )
                    }
                }
            }
            VStack(alignment: .leading, spacing: 10) {
                Label2("Vibe")
                HStack(spacing: 8) {
                    ForEach(vibeOptions) { v in
                        Chip(
                            label: v.label,
                            symbol: v.symbol,
                            isActive: vibe == v,
                            action: { vibe = v }
                        )
                    }
                }
            }
        }
    }

    private var generateButton: some View {
        Button(action: generate) {
            HStack(spacing: 10) {
                Image(systemName: "sparkles")
                    .font(.system(size: 15, weight: .semibold))
                Text("Generate a run")
                    .font(.system(size: 17, weight: .semibold, design: .serif))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.traceInk)
            .foregroundStyle(Color.traceCream)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .disabled(isGenerating)
    }

    private var footnote: some View {
        let usingClaude = Config.aiWorkerURL != nil
        return Text(usingClaude
            ? "Generation uses Claude Opus 4.7 via a Cloudflare Worker that proxies the Anthropic API. The Worker holds the API key as a server-side secret; no key ships in the app."
            : "AI generation is mocked in this build for offline demos. To enable real generation, deploy worker/ and set the URL in Trace/Config.swift.")
            .font(.system(size: 12))
            .foregroundStyle(Color.traceMuted.opacity(0.85))
            .padding(.top, 4)
    }

    private func generate() {
        isGenerating = true
        stage = .searching
        Task {
            let request = GenerateRequest(
                center: pinCoordinate,
                cityHint: nil,
                distanceKm: distance,
                vibe: vibe
            )
            do {
                let run = try await service.generateRun(request) { newStage in
                    Task { @MainActor in
                        withAnimation(.easeInOut) { stage = newStage }
                    }
                }
                store.addGenerated(run)
                generated = run
                isGenerating = false
                showResult = true
            } catch {
                isGenerating = false
            }
        }
    }
}

private struct Label2: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text.uppercased())
            .font(.traceLabel)
            .tracking(2.4)
            .foregroundStyle(Color.traceMuted)
    }
}

private struct Chip: View {
    let label: String
    var symbol: String? = nil
    let isActive: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let symbol {
                    Image(systemName: symbol).font(.system(size: 11, weight: .semibold))
                }
                Text(label).font(.traceLabel).tracking(0.4)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(isActive ? Color.traceInk : Color.traceCream)
            .foregroundStyle(isActive ? Color.traceCream : Color.traceInk)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(Color.traceHair.opacity(isActive ? 0 : 0.6), lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct GeneratingOverlay: View {
    let vibe: Vibe
    let stage: GenerationStage

    private var message: String {
        switch stage {
        case .searching: "Looking for things worth running past…"
        case .routing:   "Tracing your route…"
        case .writing:   "Asking Claude to write it up…"
        }
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.55).ignoresSafeArea()
            VStack(spacing: 18) {
                Image(systemName: vibe.symbol)
                    .font(.system(size: 38, weight: .light))
                    .foregroundStyle(.white)
                    .symbolEffect(.pulse, options: .repeating)
                Text(message)
                    .font(.system(size: 16, weight: .regular, design: .serif))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 36)
                    .id(stage)
                    .transition(.opacity)
            }
        }
    }
}

extension MKCoordinateRegion {
    static let defaultRegion = MKCoordinateRegion(
        center: .defaultPin,
        span: MKCoordinateSpan(latitudeDelta: 0.04, longitudeDelta: 0.04)
    )
}

extension CLLocationCoordinate2D {
    static let defaultPin = CLLocationCoordinate2D(latitude: 40.7295, longitude: -73.9965)
}

#Preview {
    GenerateView().environment(RunStore())
}
