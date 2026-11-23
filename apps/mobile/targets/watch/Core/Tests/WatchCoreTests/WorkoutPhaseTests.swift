import XCTest

@testable import WatchCore

final class WorkoutPhaseTests: XCTestCase {
    func testPhasesAndEventsAreTheFixtureOnes() throws {
        let table = try XCTUnwrap(fixture("transitions.json") as? [String: Any])
        XCTAssertEqual(table["phases"] as? [String], WorkoutPhase.allCases.map(\.rawValue))
        XCTAssertEqual(table["events"] as? [String], WorkoutEvent.allCases.map(\.rawValue))
    }

    func testEveryPairGoesWhereTheFixtureSays() throws {
        let table = try XCTUnwrap(fixture("transitions.json") as? [String: Any])
        var allowed: [String: String] = [:]
        for transition in cases(table["allowed"]) {
            let from = try XCTUnwrap(transition["from"] as? String)
            let event = try XCTUnwrap(transition["event"] as? String)
            allowed["\(from) \(event)"] = try XCTUnwrap(transition["to"] as? String)
        }
        XCTAssertEqual(allowed.count, 8)
        for phase in WorkoutPhase.allCases {
            for event in WorkoutEvent.allCases {
                XCTAssertEqual(
                    phase.after(event)?.rawValue, allowed["\(phase.rawValue) \(event.rawValue)"],
                    "\(phase) after \(event)")
            }
        }
    }
}
