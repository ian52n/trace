import Foundation
import Observation

@Observable
final class RunStore {
    private(set) var curated: [Run] = []
    private(set) var generated: [Run] = []
    private(set) var savedIDs: Set<UUID> = []

    private let savedFileURL: URL
    private let generatedFileURL: URL

    init(bundle: Bundle = .main) {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        self.savedFileURL = docs.appendingPathComponent("saved.json")
        self.generatedFileURL = docs.appendingPathComponent("generated.json")
        loadCurated(from: bundle)
        loadPersisted()
    }

    var allRuns: [Run] {
        generated.sorted(by: { $0.createdAt > $1.createdAt }) + curated
    }

    func isSaved(_ run: Run) -> Bool { savedIDs.contains(run.id) }

    func toggleSaved(_ run: Run) {
        if savedIDs.contains(run.id) {
            savedIDs.remove(run.id)
        } else {
            savedIDs.insert(run.id)
        }
        persistSaved()
    }

    func addGenerated(_ run: Run) {
        generated.insert(run, at: 0)
        persistGenerated()
    }

    func savedRuns() -> [Run] {
        allRuns.filter { savedIDs.contains($0.id) }
    }

    private func loadCurated(from bundle: Bundle) {
        guard let url = bundle.url(forResource: "curated_runs", withExtension: "json") else {
            print("curated_runs.json not found in bundle")
            return
        }
        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            self.curated = try decoder.decode([Run].self, from: data)
        } catch {
            print("Failed to load curated runs: \(error)")
        }
    }

    private func loadPersisted() {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        if let data = try? Data(contentsOf: savedFileURL),
           let ids = try? decoder.decode([UUID].self, from: data) {
            self.savedIDs = Set(ids)
        }
        if let data = try? Data(contentsOf: generatedFileURL),
           let runs = try? decoder.decode([Run].self, from: data) {
            self.generated = runs
        }
    }

    private func persistSaved() {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        try? encoder.encode(Array(savedIDs)).write(to: savedFileURL, options: .atomic)
    }

    private func persistGenerated() {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        try? encoder.encode(generated).write(to: generatedFileURL, options: .atomic)
    }
}
