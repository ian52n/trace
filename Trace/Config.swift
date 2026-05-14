import Foundation

enum Config {
    /// Cloudflare Worker URL for AI generation. Set this after deploying `worker/`.
    /// When nil, the app falls back to `MockAIService` so the demo always works.
    ///
    /// Example after deploy:
    ///   static let aiWorkerURL: URL? = URL(string: "https://trace-ai.yourname.workers.dev")
    static let aiWorkerURL: URL? = URL(string: "https://trace-ai.trace-demo.workers.dev")
}

enum AIServiceFactory {
    static func make() -> AIService {
        if let url = Config.aiWorkerURL {
            return ClaudeAIService(workerURL: url)
        }
        return MockAIService()
    }
}
