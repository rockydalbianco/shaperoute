import XCTest

@testable import WatchCore

final class WorkoutTests: XCTestCase {
    func testTheMovingTimeLeavesThePausesOut() {
        var workout = Workout(activity: "running")
        XCTAssertTrue(workout.apply(.start, at: 1_000))
        XCTAssertEqual(workout.phase, .countdown)
        XCTAssertEqual(workout.movingMs(at: 4_000), 0)
        XCTAssertTrue(workout.apply(.countdownDone, at: 4_000))
        XCTAssertEqual(workout.startedAt, 4_000)
        XCTAssertEqual(workout.movingMs(at: 64_000), 60_000)
        XCTAssertTrue(workout.apply(.pause, at: 64_000))
        XCTAssertEqual(workout.movingMs(at: 100_000), 60_000)
        XCTAssertTrue(workout.apply(.resume, at: 100_000))
        XCTAssertEqual(workout.movingMs(at: 130_000), 90_000)
        XCTAssertTrue(workout.apply(.end, at: 130_000))
        XCTAssertEqual(workout.phase, .finished)
        XCTAssertEqual(workout.movingMs(at: 500_000), 90_000)
        XCTAssertEqual(workout.startedAt, 4_000)
    }

    func testAnEventThatDoesNotApplyChangesNothing() {
        var workout = Workout(activity: "cycling")
        workout.apply(.start, at: 0)
        workout.apply(.countdownDone, at: 3_000)
        let before = workout
        XCTAssertFalse(workout.apply(.resume, at: 10_000))
        XCTAssertFalse(workout.apply(.start, at: 10_000))
        XCTAssertEqual(workout, before)
    }

    func testTheSameCommandTwiceIsAppliedOnce() {
        var workout = Workout(activity: "running")
        workout.apply(.start, at: 0)
        workout.apply(.countdownDone, at: 3_000)
        XCTAssertTrue(workout.apply(command: .pause, at: 13_000))
        XCTAssertFalse(workout.apply(command: .pause, at: 14_000))
        XCTAssertEqual(workout.movingMs(at: 20_000), 10_000)
    }

    func testAnEndDuringTheCountdownRecordsNothing() {
        var workout = Workout(activity: "walking")
        workout.apply(command: .start, at: 0)
        XCTAssertTrue(workout.apply(command: .end, at: 1_000))
        XCTAssertEqual(workout.phase, .ready)
        XCTAssertNil(workout.startedAt)
    }

    func testAResetStartsAgainFromNothing() {
        var workout = Workout(activity: "gym")
        workout.apply(.start, at: 0)
        workout.apply(.countdownDone, at: 3_000)
        workout.apply(.end, at: 63_000)
        XCTAssertTrue(workout.apply(.reset, at: 70_000))
        XCTAssertEqual(workout.phase, .ready)
        XCTAssertNil(workout.startedAt)
        XCTAssertEqual(workout.movingMs(at: 80_000), 0)
    }

    func testAClockGoingBackTakesNothingAway() {
        var workout = Workout(activity: "running")
        workout.apply(.start, at: 0)
        workout.apply(.countdownDone, at: 10_000)
        XCTAssertEqual(workout.movingMs(at: 9_000), 0)
    }

    func testTheStateMessageSaysWhereTheWorkoutIs() throws {
        var workout = Workout(activity: "paddling")
        workout.apply(.start, at: 0)
        workout.apply(.countdownDone, at: 3_000)
        let message = workout.stateMessage(from: .watch, at: 63_000, distanceM: 250)
        XCTAssertEqual(
            message,
            .state(
                phase: .running, activity: "paddling", from: .watch, at: 63_000,
                movingMs: 60_000, distanceM: 250))
        XCTAssertEqual(try WatchMessage.decode(message.encoded()), message)
    }
}
