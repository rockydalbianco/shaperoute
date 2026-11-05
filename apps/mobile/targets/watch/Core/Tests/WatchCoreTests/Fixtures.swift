import Foundation

/// The JSON in Fixtures/, which the phone's jest tests read too
/// (src/watch/watchMessages.test.ts).
func fixture(_ name: String) throws -> Any {
    let url = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .appendingPathComponent("Fixtures")
        .appendingPathComponent(name)
    return try JSONSerialization.jsonObject(
        with: Data(contentsOf: url), options: [.fragmentsAllowed])
}

/// The cases in a list of a fixture; none when it is not one.
func cases(_ value: Any?) -> [[String: Any]] {
    value as? [[String: Any]] ?? []
}
