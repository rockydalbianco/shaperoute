import Foundation
import XCTest

@testable import WatchCore

/// The watch's guidance against the phone's (TASK-370 part B1): each file in
/// Fixtures/guide/ is a made-up run on a real route with what the phone's
/// navigator did after each fix, written by apps/mobile/scripts/watch-guide.sh.
/// The Swift navigator follows the same fixes and must do the same: the
/// metres within a centimetre, the rest alike.
final class GuideTests: XCTestCase {
    /// Metres and degrees may differ this much: the two sides round their
    /// sines and roots apart.
    let tolerance = 0.01

    func testEveryTraceIsFollowedAsOnThePhone() throws {
        let names = try traceNames()
        XCTAssertGreaterThanOrEqual(names.count, 14, "the guide traces are missing")
        for name in names {
            try follow(name)
        }
    }

    func testAChainOfJoinedTurnsIsCountedTogether() {
        let directions = [
            GuideDirection(distanceM: 0, turn: "depart", angleDeg: 0, joined: false, street: nil),
            GuideDirection(distanceM: 100, turn: "left", angleDeg: -90, joined: false, street: nil),
            GuideDirection(distanceM: 108, turn: "right", angleDeg: 90, joined: true, street: nil),
            GuideDirection(distanceM: 300, turn: "left", angleDeg: -90, joined: false, street: nil),
        ]
        XCTAssertEqual(Navigator.chainCount(directions, from: 1), 2)
        XCTAssertEqual(Navigator.chainCount(directions, from: 3), 1)
    }

    func testNoFixIsTakenAfterArriving() {
        let points = [LatLon(46.0, 11.0), LatLon(46.0005, 11.0)]
        var (navigation, cues) = Navigator.start(points: points, directions: [])
        XCTAssertEqual(cues, [])
        for _ in 0..<2 {
            (navigation, cues) = Navigator.onFix(navigation, points[1])
        }
        XCTAssertTrue(navigation.arrived)
        XCTAssertEqual(cues, [.arrived])
        let after = Navigator.onFix(navigation, points[0])
        XCTAssertEqual(after.0, navigation)
        XCTAssertEqual(after.1, [])
    }

    // MARK: - The traces

    private func traceNames() throws -> [String] {
        let files = try FileManager.default.contentsOfDirectory(atPath: guideDirectory().path)
        return files.filter { $0.hasSuffix(".json") }.sorted()
    }

    private func guideDirectory() -> URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures")
            .appendingPathComponent("guide")
    }

    private func follow(_ file: String) throws {
        let trace = try XCTUnwrap(
            try fixture("guide/\(file)") as? [String: Any], "\(file) is not an object")
        XCTAssertEqual(trace["version"] as? Int, 1, file)
        let points = try (trace["points"] as? [[Double]] ?? []).map(latLon)
        let directions = try (trace["directions"] as? [[String: Any]] ?? []).map(direction)
        let announceM = try XCTUnwrap(trace["announceM"] as? Double, file)
        var (navigation, cues) = Navigator.start(
            points: points, directions: directions, announceM: announceM)
        try expect(cues, trace["start"], "\(file) start")
        for (i, step) in cases(trace["steps"]).enumerated() {
            let at = "\(file) step \(i)"
            let fix = try latLon(XCTUnwrap(step["fix"] as? [Double], at))
            let reading = GuideReading(
                accuracyM: step["accuracyM"] as? Double, timeMs: step["timeMs"] as? Double)
            (navigation, cues) = Navigator.onFix(navigation, fix, reading)
            try expectClose(navigation.alongM, step["alongM"], "\(at) alongM")
            XCTAssertEqual(navigation.next, step["next"] as? Int, "\(at) next")
            XCTAssertEqual(navigation.saidUpTo, step["saidUpTo"] as? Int, "\(at) saidUpTo")
            XCTAssertEqual(navigation.offRoute, step["offRoute"] as? Bool, "\(at) offRoute")
            XCTAssertEqual(navigation.lost, step["lost"] as? Bool, "\(at) lost")
            XCTAssertEqual(navigation.arrived, step["arrived"] as? Bool, "\(at) arrived")
            if let rejoin = step["rejoin"] as? [String: Any] {
                let mine = try XCTUnwrap(navigation.rejoin, "\(at) rejoin")
                try expectClose(mine.alongM, rejoin["alongM"], "\(at) rejoin alongM")
                try expectClose(mine.distanceM, rejoin["distanceM"], "\(at) rejoin distanceM")
                try expectClose(mine.bearingDeg, rejoin["bearingDeg"], "\(at) rejoin bearingDeg")
            } else {
                XCTAssertNil(navigation.rejoin, "\(at) rejoin")
            }
            try expect(cues, step["cues"], at)
            if navigation.alongM.isNaN {
                return XCTFail("\(at): lost the route")
            }
        }
    }

    private func expect(_ cues: [GuideCue], _ json: Any?, _ at: String) throws {
        let expected = cases(json)
        XCTAssertEqual(cues.count, expected.count, "\(at) cues \(cues)")
        for (cue, want) in zip(cues, expected) {
            XCTAssertEqual(cue.vibrates, want["vibrate"] as? Bool, "\(at) \(cue) vibrate")
            switch cue {
            case .depart(let index):
                XCTAssertEqual(want["kind"] as? String, "depart", at)
                XCTAssertEqual(index, want["index"] as? Int, at)
            case .turn(let index, let count, let aheadM):
                XCTAssertEqual(want["kind"] as? String, "turn", at)
                XCTAssertEqual(index, want["index"] as? Int, "\(at) turn index")
                XCTAssertEqual(count, want["count"] as? Int, "\(at) turn count")
                try expectClose(aheadM, want["aheadM"], "\(at) turn aheadM")
            case .offRoute:
                XCTAssertEqual(want["kind"] as? String, "offRoute", at)
            case .routeAt(let distanceM, let bearingDeg):
                XCTAssertEqual(want["kind"] as? String, "routeAt", at)
                try expectClose(distanceM, want["distanceM"], "\(at) routeAt distanceM")
                try expectClose(bearingDeg, want["bearingDeg"], "\(at) routeAt bearingDeg")
            case .backOnRoute:
                XCTAssertEqual(want["kind"] as? String, "backOnRoute", at)
            case .arrived:
                XCTAssertEqual(want["kind"] as? String, "arrived", at)
            }
        }
    }

    private func expectClose(_ value: Double, _ json: Any?, _ at: String) throws {
        let want = try XCTUnwrap(json as? Double, "\(at) missing")
        XCTAssertEqual(value, want, accuracy: tolerance, at)
    }

    private func latLon(_ pair: [Double]) throws -> LatLon {
        guard pair.count == 2 else {
            throw GuideTraceError.badPoint
        }
        return LatLon(pair[0], pair[1])
    }

    private func direction(_ json: [String: Any]) throws -> GuideDirection {
        GuideDirection(
            distanceM: try XCTUnwrap(json["distance_m"] as? Double),
            turn: try XCTUnwrap(json["turn"] as? String),
            angleDeg: try XCTUnwrap(json["angle_deg"] as? Double),
            joined: try XCTUnwrap(json["joined"] as? Bool),
            street: json["street"] as? String
        )
    }
}

private enum GuideTraceError: Error {
    case badPoint
}
