import XCTest

@testable import WatchCore

final class WatchMessageTests: XCTestCase {
    func testEveryValidFixtureIsReadAndWrittenBack() throws {
        let fixtures = try XCTUnwrap(fixture("messages.json") as? [String: Any])
        let valid = cases(fixtures["valid"])
        XCTAssertFalse(valid.isEmpty)
        for entry in valid {
            let name = entry["name"] as? String ?? "?"
            let json = try XCTUnwrap(entry["json"], name)
            let message = try WatchMessage.decode(json)
            let expected = try XCTUnwrap((entry["encoded"] ?? json) as? [String: Any], name)
            XCTAssertEqual(
                NSDictionary(dictionary: message.encoded()), NSDictionary(dictionary: expected),
                name)
        }
    }

    func testEveryInvalidFixtureIsRefusedWithItsCode() throws {
        let fixtures = try XCTUnwrap(fixture("messages.json") as? [String: Any])
        let invalid = cases(fixtures["invalid"])
        XCTAssertFalse(invalid.isEmpty)
        for entry in invalid {
            let name = entry["name"] as? String ?? "?"
            let json = try XCTUnwrap(entry["json"], name)
            XCTAssertThrowsError(try WatchMessage.decode(json), name) { error in
                XCTAssertEqual(
                    (error as? WatchMessageError)?.rawValue, entry["error"] as? String, name)
            }
        }
    }

    func testTheBytesOfAMessageAreRead() throws {
        let data = Data(#"{"v":1,"type":"heartRate","bpm":120,"at":5}"#.utf8)
        XCTAssertEqual(try WatchMessage.decode(json: data), .heartRate(bpm: 120, at: 5))
        XCTAssertThrowsError(try WatchMessage.decode(json: Data("{".utf8))) { error in
            XCTAssertEqual(error as? WatchMessageError, .notAnObject)
        }
    }

    func testAStartSaysItsSport() throws {
        let message = WatchMessage.start(activity: "running", from: .phone, at: 7)
        let fields = message.encoded()
        XCTAssertEqual(fields["command"] as? String, "start")
        XCTAssertEqual(fields["activity"] as? String, "running")
        XCTAssertEqual(try WatchMessage.decode(fields), message)
    }

    func testTheUnitsOfThePhoneAreRead() throws {
        let fields: [String: Any] = ["v": 1, "type": "settings", "units": "mi", "at": 9]
        XCTAssertEqual(
            try WatchMessage.decode(fields), .settings(units: .mi, heartZones: nil, at: 9))
        XCTAssertEqual(
            NSDictionary(
                dictionary: WatchMessage.settings(units: .km, heartZones: nil, at: 3).encoded()),
            NSDictionary(dictionary: ["v": 1, "type": "settings", "units": "km", "at": 3]))
    }

    func testTheZonesOfThePhoneAreRead() throws {
        let limits = [95, 114, 133, 152, 171, 190]
        let fields: [String: Any] = [
            "v": 1, "type": "settings", "units": "km", "heartZones": limits, "at": 9,
        ]
        let zones = try XCTUnwrap(HeartZones(limits: limits))
        XCTAssertEqual(
            try WatchMessage.decode(fields), .settings(units: .km, heartZones: zones, at: 9))
        XCTAssertEqual(
            WatchMessage.settings(units: .km, heartZones: zones, at: 9).encoded()["heartZones"]
                as? [Int], limits)
    }
}
