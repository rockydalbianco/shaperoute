import XCTest

@testable import WatchCore

/// A finished workout as a file for the phone (TASK-370 part B3c): the same
/// fixtures as the phone's jest (src/watch/watchTrack.test.ts).
final class WatchTrackTests: XCTestCase {
    func testEveryValidFixtureIsReadAndWrittenBack() throws {
        let fixtures = try XCTUnwrap(fixture("tracks.json") as? [String: Any])
        let valid = cases(fixtures["valid"])
        XCTAssertFalse(valid.isEmpty)
        for entry in valid {
            let name = entry["name"] as? String ?? "?"
            let json = try XCTUnwrap(entry["json"] as? [String: Any], name)
            let track = try WatchTrack.decode(json)
            XCTAssertEqual(
                NSDictionary(dictionary: track.encoded()), NSDictionary(dictionary: json), name)
            let bytes = try track.data()
            XCTAssertEqual(try WatchTrack.decode(JSONSerialization.jsonObject(with: bytes)), track, name)
        }
    }

    func testEveryInvalidFixtureIsRefusedWithItsCode() throws {
        let fixtures = try XCTUnwrap(fixture("tracks.json") as? [String: Any])
        let invalid = cases(fixtures["invalid"])
        XCTAssertFalse(invalid.isEmpty)
        for entry in invalid {
            let name = entry["name"] as? String ?? "?"
            XCTAssertThrowsError(try WatchTrack.decode(entry["json"]), name) { error in
                XCTAssertEqual(
                    (error as? WatchMessageError)?.rawValue, entry["error"] as? String, name)
            }
        }
    }

    private func fix(_ second: Int64, accuracy: Double? = 5) -> TrackFixPoint {
        TrackFixPoint(
            point: LatLon(46 + Double(second) * 1e-5, 11), timeMs: second * 1000,
            accuracyM: accuracy, altitudeM: nil)
    }

    func testTheLogLeavesOutPoorFixesFixesOutOfOrderAndThePauses() {
        var log = TrackLog()
        log.add(fix(1))
        log.add(fix(2, accuracy: 60))
        log.add(fix(1))
        log.add(fix(3, accuracy: nil))
        log.pause(at: 4000)
        log.add(fix(5))
        log.resume(at: 9000)
        log.add(fix(10))
        XCTAssertEqual(log.fixes.map(\.timeMs), [1000, 3000, 10_000])
        XCTAssertEqual(log.pauses, [TrackPause(fromMs: 4000, toMs: 9000)])
    }

    func testThePauseGoingOnEndsWithTheWorkout() {
        var log = TrackLog()
        log.add(fix(1))
        log.pause(at: 2000)
        let track = log.track(
            activity: "running", startedAtMs: 0, endedAtMs: 7000, status: .stopped, route: nil,
            distanceM: 10, movingMs: 2000, kcal: nil, heartAvgBpm: nil)
        XCTAssertEqual(track.pauses, [TrackPause(fromMs: 2000, toMs: 7000)])
        XCTAssertNil(track.route)
    }

    func testALongTrackKeepsTheMostThePhoneTakesEvenly() {
        var log = TrackLog()
        for second in 1...Int64(WatchTrack.maxFixes + 500) {
            log.add(fix(second))
        }
        let track = log.track(
            activity: "cycling", startedAtMs: 0, endedAtMs: 30_000_000, status: .stopped,
            route: nil, distanceM: 1, movingMs: 1, kcal: nil, heartAvgBpm: nil)
        XCTAssertEqual(track.fixes.count, WatchTrack.maxFixes)
        XCTAssertEqual(track.fixes.first, log.fixes.first)
        XCTAssertEqual(track.fixes.last, log.fixes.last)
    }

    func testTheRouteGoesBackWithItsSimilarity() throws {
        let route = WatchRoute(
            key: "k", title: "Star", activity: "running", distanceM: 1000,
            points: [LatLon(46, 11), LatLon(46.001, 11)], directions: [], walks: [],
            word: nil, anywhere: false, ride: false, paddle: false, announceM: 50,
            similarity: 0.9)
        let track = TrackLog().track(
            activity: "running", startedAtMs: 0, endedAtMs: 1, status: .arrived, route: route,
            distanceM: 0, movingMs: 0, kcal: 1, heartAvgBpm: 120)
        XCTAssertEqual(track.route?.similarity, 0.9)
        XCTAssertEqual(try WatchTrack.decode(track.encoded()), track)
    }
}
