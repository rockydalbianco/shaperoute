import Foundation
import XCTest

@testable import WatchCore

/// The watch's guidance against the phone's (TASK-370 parts B1, B2): each file in
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
        XCTAssertGreaterThanOrEqual(names.count, 26, "the guide traces are missing")
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
        XCTAssertEqual(trace["version"] as? Int, 2, file)
        let points = try (trace["points"] as? [[Double]] ?? []).map(latLon)
        let directions = try (trace["directions"] as? [[String: Any]] ?? []).map(direction)
        let announceM = try XCTUnwrap(trace["announceM"] as? Double, file)
        let anywhere = try XCTUnwrap(trace["anywhere"] as? Bool, file)
        var (navigation, cues) = Navigator.start(
            points: points, directions: directions, announceM: announceM, anywhere: anywhere)
        try expect(cues, trace["start"], "\(file) start")
        var pen = try startPen(trace["pen"], along: navigation.along, file)
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
            XCTAssertEqual(navigation.waitingToJoin, step["waiting"] as? Bool, "\(at) waiting")
            if let joinedAtM = step["joinedAtM"] as? Double {
                try expectClose(try XCTUnwrap(navigation.joinedAtM, at), joinedAtM, "\(at) joinedAtM")
            } else {
                XCTAssertNil(navigation.joinedAtM, "\(at) joinedAtM")
            }
            if let route = step["route"] as? [String: Any] {
                XCTAssertEqual(navigation.points.count, route["pointCount"] as? Int, "\(at) route points")
                try expectClose(navigation.along.last ?? 0, route["lengthM"], "\(at) route length")
                let want = try (route["directions"] as? [[String: Any]] ?? []).map(direction)
                try expectSame(navigation.directions, want, "\(at) route")
            }
            if var drawing = pen {
                let moved = Pen.move(drawing, alongM: navigation.alongM, accuracyM: reading.accuracyM)
                drawing = moved.0
                pen = drawing
                let want = try XCTUnwrap(step["pen"] as? [String: Any], "\(at) pen")
                XCTAssertEqual(drawing.next, want["next"] as? Int, "\(at) pen next")
                XCTAssertEqual(drawing.up, want["up"] as? Bool, "\(at) pen up")
                try expect(moved.2, want["cues"], "\(at) pen")
            } else {
                XCTAssertTrue(step["pen"] is NSNull, "\(at) pen")
            }
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
            case .penUp(let letter):
                XCTAssertEqual(want["kind"] as? String, "penUp", at)
                XCTAssertEqual(letter, want["letter"] as? String, "\(at) pen letter")
            case .penDown(let letter):
                XCTAssertEqual(want["kind"] as? String, "penDown", at)
                XCTAssertEqual(letter, want["letter"] as? String, "\(at) pen letter")
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
            street: json["street"] as? String,
            branches: try XCTUnwrap(json["branches"] as? Int)
        )
    }

    /// Two lists of directions alike, but where each junction is.
    private func expectSame(
        _ mine: [GuideDirection], _ want: [GuideDirection], _ at: String
    ) throws {
        XCTAssertEqual(mine.count, want.count, "\(at) directions")
        for (i, (a, b)) in zip(mine, want).enumerated() {
            XCTAssertEqual(a.distanceM, b.distanceM, accuracy: tolerance, "\(at) \(i) distance")
            XCTAssertEqual(a.angleDeg, b.angleDeg, accuracy: tolerance, "\(at) \(i) angle")
            XCTAssertEqual(a.turn, b.turn, "\(at) \(i) turn")
            XCTAssertEqual(a.joined, b.joined, "\(at) \(i) joined")
            XCTAssertEqual(a.street, b.street, "\(at) \(i) street")
            XCTAssertEqual(a.branches, b.branches, "\(at) \(i) branches")
        }
    }

    /// The pen of a trace's route in pieces, started as the phone's and
    /// checked against it; nil for a route of one piece.
    private func startPen(_ json: Any?, along: [Double], _ file: String) throws -> Pen? {
        guard let want = json as? [String: Any] else {
            return nil
        }
        let walks = cases(want["walks"])
        // The walks as the phone's pen has them, back to point indices of
        // the route: each end is a point where `along` is the metres given.
        let indices = try walks.map { walk -> (Int, Int) in
            let fromM = try XCTUnwrap(walk["fromM"] as? Double)
            let toM = try XCTUnwrap(walk["toM"] as? Double)
            let from = try XCTUnwrap(along.firstIndex { abs($0 - fromM) < tolerance }, file)
            let to = try XCTUnwrap(along.firstIndex { abs($0 - toM) < tolerance }, file)
            return (from, to)
        }
        let letters = walks.map { $0["letter"] as? String }
        let parts = try XCTUnwrap(want["parts"] as? Bool)
        let ride = try XCTUnwrap(want["ride"] as? Bool)
        let paddle = try XCTUnwrap(want["paddle"] as? Bool)
        // The word that names these letters: the first is never said.
        let word = parts ? nil : "?" + letters.map { $0 ?? "" }.joined()
        let pen = Pen.start(
            along: along, walks: indices, word: word,
            activity: ride ? "cycling" : paddle ? "paddling" : nil)
        XCTAssertEqual(pen.walks.map(\.letter), letters, "\(file) pen letters")
        XCTAssertEqual(pen.parts, parts, "\(file) pen parts")
        XCTAssertEqual(pen.ride, ride, "\(file) pen ride")
        XCTAssertEqual(pen.paddle, paddle, "\(file) pen paddle")
        XCTAssertEqual(pen.downM, try XCTUnwrap(want["downM"] as? Double), "\(file) pen downM")
        return pen
    }
}

private enum GuideTraceError: Error {
    case badPoint
}
