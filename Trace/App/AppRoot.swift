import SwiftUI

struct AppRoot: View {
    enum Tab: Hashable { case discover, generate }

    @State private var selection: Tab = .discover

    var body: some View {
        TabView(selection: $selection) {
            DiscoverView()
                .tabItem { Label("Discover", systemImage: "map") }
                .tag(Tab.discover)

            GenerateView()
                .tabItem { Label("Generate", systemImage: "sparkles") }
                .tag(Tab.generate)
        }
        .tint(Color.traceAccent)
    }
}

#Preview {
    AppRoot().environment(RunStore())
}
