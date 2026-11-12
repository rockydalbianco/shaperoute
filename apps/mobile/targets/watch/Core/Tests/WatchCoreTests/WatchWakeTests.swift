import XCTest

@testable import WatchCore

final class WatchWakeTests: XCTestCase {
    func testARunWakesTheRun() throws {
        let sports = try WatchSports.offered()
        XCTAssertEqual(
            WatchWake.sport(appleWorkout: 37, outdoor: true, among: sports)?.activity, "running")
    }

    func testTheGymIsIndoors() throws {
        let sports = try WatchSports.offered()
        XCTAssertEqual(
            WatchWake.sport(appleWorkout: 50, outdoor: false, among: sports)?.activity, "gym")
        // Indoors or not, the gym is the only one of its kind.
        XCTAssertEqual(
            WatchWake.sport(appleWorkout: 50, outdoor: true, among: sports)?.activity, "gym")
    }

    func testSportsOfTheSameKindTakeTheFirst() throws {
        // Cycling, mountain biking and gravel are all Apple's cycling: the
        // phone's start, with the app's sport, says which.
        let sports = try WatchSports.offered()
        XCTAssertEqual(
            WatchWake.sport(appleWorkout: 13, outdoor: true, among: sports)?.activity, "cycling")
    }

    func testAFlightWakesTheFlight() throws {
        // Apple's `.other`, the paragliding flight's (TASK-305 part R4).
        let sports = try WatchSports.offered()
        XCTAssertEqual(
            WatchWake.sport(appleWorkout: 3000, outdoor: true, among: sports)?.activity,
            "paragliding")
    }

    func testASportTheWatchDoesNotOfferWakesNothing() throws {
        let sports = try WatchSports.offered()
        // The open-water swim is off on the watch.
        XCTAssertNil(WatchWake.sport(appleWorkout: 46, outdoor: true, among: sports))
        // American football: no sport of MuW's.
        XCTAssertNil(WatchWake.sport(appleWorkout: 1, outdoor: true, among: sports))
    }
}
