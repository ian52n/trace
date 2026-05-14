import SwiftUI

@main
struct TraceApp: App {
    @State private var store = RunStore()

    var body: some Scene {
        WindowGroup {
            AppRoot()
                .environment(store)
                .preferredColorScheme(.light)
        }
    }
}
