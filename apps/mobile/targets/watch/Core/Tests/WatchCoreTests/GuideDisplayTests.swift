import XCTest

@testable import WatchCore

/// What the wrist shows and feels on a run with a route (TASK-370 part
/// B3b): the arrow first, the vibrations as Apple Maps gives them.
final class GuideDisplayTests: XCTestCase {
    // 500 m north from the start, then 500 m east: a right turn onto Via Est.
    let start = LatLon(46.0, 11.0)
    let metrePerDegLat = 111_195.0

    private func north(_ m: Double) -> LatLon {
        LatLon(start.lat + m / metrePerDegLat, start.lon)
    }

    private func east(_ m: Double, of point: LatLon) -> LatLon {
        LatLon(point.lat, point.lon + m / (metrePerDegLat * cos(point.lat * .pi / 180)))
    }

    private var points: [LatLon] {
        (0...10).map { north(Double($0) * 50) }
            + (1...10).map { east(Double($0) * 50, of: north(500)) }
    }

    private let directions = [
        GuideDirection(distanceM: 0, turn: "depart", angleDeg: 0, joined: false, street: "Via Nord"),
        GuideDirection(distanceM: 500, turn: "right", angleDeg: 90, joined: false, street: "Via Est"),
    ]

    private func run(_ fixes: [LatLon], startEvery ms: Double = 3000) -> (Navigation, [[GuideCue]]) {
        var (navigation, _) = Navigator.start(points: points, directions: directions)
        var cues: [[GuideCue]] = []
        for (i, fix) in fixes.enumerated() {
            let step = Navigator.onFix(
                navigation, fix, GuideReading(accuracyM: 5, timeMs: Double(i) * ms))
            navigation = step.0
            cues.append(step.1)
        }
        return (navigation, cues)
    }

    func testAlongTheRouteTheArrowShowsTheTurnAheadWithItsMetresAndRoad() {
        let (navigation, _) = run([north(0), north(10)])
        let screen = GuideDisplay.screen(navigation, pen: nil, headingDeg: 0)
        XCTAssertEqual(screen.mode, .following)
        XCTAssertEqual(screen.arrowDeg, 90)
        XCTAssertEqual(try XCTUnwrap(screen.metres), 490, accuracy: 1)
        XCTAssertEqual(screen.turn, "right")
        XCTAssertEqual(screen.street, "Via Est")
        XCTAssertNil(screen.pen)
    }

    func testATurnToTheRightVibratesAsAppleMapsDoes() {
        // A fix every 25 m up to 475 m: the turn is told 50 m before it.
        let (_, cues) = run((0...19).map { north(Double($0) * 25) })
        let turned = cues.flatMap { $0 }.filter {
            if case .turn = $0 { return true }
            return false
        }
        XCTAssertEqual(turned.count, 1)
        XCTAssertEqual(GuideDisplay.haptics(for: turned, directions: directions), [.right])
    }

    func testOffTheRouteTheArrowPointsToItFromTheWayTheRunnerGoes() {
        // 300 m along, then 100 m to the west for four fixes: off the route.
        let off = east(-100, of: north(300))
        let (navigation, cues) = run([north(0), north(100), north(200), north(300), off, off, off, off])
        XCTAssertTrue(navigation.offRoute)
        XCTAssertEqual(
            GuideDisplay.haptics(for: cues.flatMap { $0 }, directions: directions), [.offRoute])
        let facingNorth = GuideDisplay.screen(navigation, pen: nil, headingDeg: 0)
        XCTAssertEqual(facingNorth.mode, .offRoute)
        XCTAssertEqual(try XCTUnwrap(facingNorth.arrowDeg), 90, accuracy: 2)
        XCTAssertEqual(try XCTUnwrap(facingNorth.metres), 100, accuracy: 2)
        // Going west, the route is behind.
        let facingWest = GuideDisplay.screen(navigation, pen: nil, headingDeg: 270)
        XCTAssertEqual(abs(try XCTUnwrap(facingWest.arrowDeg)), 180, accuracy: 2)
        // Without a course, as on a map with north up.
        let noCourse = GuideDisplay.screen(navigation, pen: nil, headingDeg: nil)
        XCTAssertEqual(try XCTUnwrap(noCourse.arrowDeg), 90, accuracy: 2)
    }

    func testAtTheEndTheScreenSaysSo() {
        let end = east(500, of: north(500))
        let along = (0...10).map { north(Double($0) * 50) }
            + (1...10).map { east(Double($0) * 50, of: north(500)) } + [end]
        let (navigation, cues) = run(along)
        XCTAssertTrue(navigation.arrived)
        XCTAssertEqual(GuideDisplay.screen(navigation, pen: nil, headingDeg: 90).mode, .arrived)
        XCTAssertEqual(
            GuideDisplay.haptics(for: cues.flatMap { $0 }, directions: directions),
            [.right, .arrived])
    }

    func testPastTheLastTurnTheArrowPointsAheadToTheEnd() {
        let (navigation, _) = run((0...10).map { north(Double($0) * 50) } + [east(100, of: north(500))])
        let screen = GuideDisplay.screen(navigation, pen: nil, headingDeg: 90)
        XCTAssertEqual(screen.arrowDeg, 0)
        XCTAssertNil(screen.turn)
        XCTAssertEqual(try XCTUnwrap(screen.metres), 400, accuracy: 2)
    }

    func testAClosedRouteNotJoinedYetWaits() {
        let loop = points + [start]
        var (navigation, cues) = Navigator.start(
            points: loop, directions: [], anywhere: true)
        XCTAssertEqual(cues, [])
        (navigation, cues) = Navigator.onFix(navigation, east(-500, of: north(250)))
        let screen = GuideDisplay.screen(navigation, pen: nil, headingDeg: 0)
        XCTAssertEqual(screen.mode, .waiting)
        XCTAssertNil(screen.arrowDeg)
    }

    func testThePenUpNamesTheNextLetterOrPart() {
        let along = RouteProgress.cumulative(points)
        var word = Pen.start(along: along, walks: [(2, 5)], word: "io", ride: false, paddle: false)
        XCTAssertNil(GuideDisplay.penNote(word))
        let up = Pen.move(word, alongM: along[2] + 1)
        word = up.0
        XCTAssertEqual(GuideDisplay.haptics(for: up.2, directions: []), [.pen])
        XCTAssertEqual(GuideDisplay.penNote(word), .toLetter("O"))
        var parts = Pen.start(along: along, walks: [(2, 5)], word: nil, ride: false, paddle: false)
        parts = Pen.move(parts, alongM: along[2] + 1).0
        XCTAssertEqual(GuideDisplay.penNote(parts), .nextPart)
        let (navigation, _) = run([north(0), north(120)])
        XCTAssertEqual(GuideDisplay.screen(navigation, pen: word, headingDeg: 0).pen, .toLetter("O"))
    }

    func testTheCuesThatAreOnlyShownDoNotVibrate() {
        XCTAssertEqual(
            GuideDisplay.haptics(
                for: [.depart(index: 0), .routeAt(distanceM: 40, bearingDeg: 10)],
                directions: directions),
            [])
        XCTAssertEqual(
            GuideDisplay.haptics(
                for: [.backOnRoute, .turn(index: 1, count: 1, aheadM: 40)], directions: directions),
            [.backOnRoute, .right])
    }

    func testEveryTurnHasItsArrowAndItsVibration() {
        func direction(_ turn: String, _ angle: Double) -> GuideDirection {
            GuideDirection(distanceM: 100, turn: turn, angleDeg: angle, joined: false, street: nil)
        }
        let cases: [(String, Double, Double, GuideHaptic)] = [
            ("left", -90, -90, .left),
            ("sharp-left", -150, -150, .left),
            ("right", 80, 80, .right),
            ("sharp-right", 140, 140, .right),
            ("u-turn", -175, 180, .maneuver),
            ("straight", 12, 0, .maneuver),
        ]
        for (turn, angle, arrow, haptic) in cases {
            let made = direction(turn, angle)
            XCTAssertEqual(GuideDisplay.arrow(made), arrow, turn)
            XCTAssertEqual(
                GuideDisplay.haptic(for: .turn(index: 0, count: 1, aheadM: 40), directions: [made]),
                haptic, turn)
        }
        XCTAssertEqual(
            GuideDisplay.haptic(for: .turn(index: 5, count: 1, aheadM: 40), directions: []),
            .maneuver)
    }
}
