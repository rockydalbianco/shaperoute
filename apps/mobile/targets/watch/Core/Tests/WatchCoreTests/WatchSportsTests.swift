import XCTest

@testable import WatchCore

final class WatchSportsTests: XCTestCase {
    func testTheTableIsRead() throws {
        let sports = try WatchSports.all()
        XCTAssertFalse(sports.isEmpty)
        XCTAssertEqual(Set(sports.map(\.activity)).count, sports.count)
        XCTAssertEqual(sports.first?.activity, "running")
    }

    func testARunIsGuidedOutdoors() throws {
        let run = try XCTUnwrap(try WatchSports.all().first { $0.activity == "running" })
        XCTAssertEqual(run.appleWorkout, 37)
        XCTAssertEqual(run.pace, .km)
        XCTAssertTrue(run.guided)
        XCTAssertTrue(run.gps)
        XCTAssertTrue(run.onWatch)
    }

    func testTheGymHasNoGPSAndTheSkiNoRoute() throws {
        let sports = try WatchSports.all()
        let gym = try XCTUnwrap(sports.first { $0.activity == "gym" })
        XCTAssertFalse(gym.gps)
        XCTAssertFalse(gym.guided)
        let ski = try XCTUnwrap(sports.first { $0.activity == "skiing" })
        XCTAssertTrue(ski.gps)
        XCTAssertFalse(ski.guided)
    }

    func testTheSwimIsNotOfferedYet() throws {
        let swim = try XCTUnwrap(try WatchSports.all().first { $0.activity == "swimming" })
        XCTAssertEqual(swim.pace, .swim)
        XCTAssertTrue(swim.onWater)
        XCTAssertFalse(swim.onWatch)
        XCTAssertFalse(try WatchSports.offered().contains(swim))
    }

    func testAnotherVersionIsRefused() {
        let data = Data(#"{"version":2,"sports":[]}"#.utf8)
        XCTAssertThrowsError(try WatchSports.read(data))
    }
}
