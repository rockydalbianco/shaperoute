import XCTest

@testable import WatchCore

/// The texts of Fixtures/format.json, which src/watch/watchFormat.test.ts
/// checks against the app's own functions.
final class WatchFormatTests: XCTestCase {
    func testTheClock() throws {
        let file = try XCTUnwrap(try fixture("format.json") as? [String: Any])
        let all = cases(file["clock"])
        XCTAssertFalse(all.isEmpty)
        for item in all {
            let ms = try XCTUnwrap(item["ms"] as? NSNumber).int64Value
            XCTAssertEqual(WatchFormat.clock(ms: ms), item["text"] as? String, "\(ms) ms")
        }
    }

    func testTheDistance() throws {
        let file = try XCTUnwrap(try fixture("format.json") as? [String: Any])
        let all = cases(file["distance"])
        XCTAssertFalse(all.isEmpty)
        for item in all {
            let metres = try XCTUnwrap(item["metres"] as? NSNumber).doubleValue
            let units = try XCTUnwrap(WatchUnits(rawValue: item["units"] as? String ?? ""))
            XCTAssertEqual(
                WatchFormat.distance(metres: metres, units: units), item["text"] as? String,
                "\(metres) m in \(units)")
        }
    }

    func testThePace() throws {
        let file = try XCTUnwrap(try fixture("format.json") as? [String: Any])
        let all = cases(file["pace"])
        XCTAssertFalse(all.isEmpty)
        for item in all {
            let metres = try XCTUnwrap(item["metres"] as? NSNumber).doubleValue
            let ms = try XCTUnwrap(item["ms"] as? NSNumber).int64Value
            let pace = try XCTUnwrap(WatchPace(rawValue: item["pace"] as? String ?? ""))
            let units = try XCTUnwrap(WatchUnits(rawValue: item["units"] as? String ?? ""))
            XCTAssertEqual(
                WatchFormat.pace(metres: metres, ms: ms, pace: pace, units: units),
                item["text"] as? String, "\(metres) m in \(ms) ms, \(pace) in \(units)")
        }
    }
}
