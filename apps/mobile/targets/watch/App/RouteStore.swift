import Foundation
import WatchCore

/// The routes the phone sent, kept on the watch (TASK-370 part B3a): WatchCore's
/// RouteShelf, saved in a file of the app's Application Support at each
/// change, so that they are there with the phone at home. The phone's
/// messages come through the WorkoutManager, which owns the link.
@MainActor
final class RouteStore: ObservableObject {
    @Published private(set) var shelf: RouteShelf

    private let file: URL

    init(file: URL = RouteStore.defaultFile()) {
        self.file = file
        let data = try? Data(contentsOf: file)
        shelf = RouteShelf.decode(data.flatMap { try? JSONSerialization.jsonObject(with: $0) })
    }

    var routes: [KeptRoute] { shelf.routes }

    /// A message of the phone: a route or the favorites' keys change the
    /// shelf, anything else nothing.
    func receive(_ message: WatchMessage) {
        var next = shelf
        next.receive(message)
        guard next != shelf else {
            return
        }
        shelf = next
        save()
    }

    private func save() {
        guard let data = try? JSONSerialization.data(withJSONObject: shelf.encoded()) else {
            return
        }
        try? FileManager.default.createDirectory(
            at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: file, options: .atomic)
    }

    nonisolated static func defaultFile() -> URL {
        let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first ?? FileManager.default.temporaryDirectory
        return folder.appendingPathComponent("routes.json")
    }
}
