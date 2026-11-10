import XCTest

@testable import WatchCore

final class HeartZonesTests: XCTestCase {
    // The zones of a max of 190, as the phone counts them.
    let zones = HeartZones(limits: [95, 114, 133, 152, 171, 190])!

    func testEachHeartRateIsInItsZone() {
        XCTAssertNil(zones.zone(of: 94))
        XCTAssertEqual(zones.zone(of: 95), 1)
        XCTAssertEqual(zones.zone(of: 113), 1)
        XCTAssertEqual(zones.zone(of: 114), 2)
        XCTAssertEqual(zones.zone(of: 140), 3)
        XCTAssertEqual(zones.zone(of: 160), 4)
        XCTAssertEqual(zones.zone(of: 171), 5)
    }

    func testOverTheMaxIsStillTheLastZone() {
        XCTAssertEqual(zones.zone(of: 190), 5)
        XCTAssertEqual(zones.zone(of: 210), 5)
    }

    func testOnlySixLimitsInOrderMakeZones() {
        XCTAssertNil(HeartZones(limits: [95, 114, 133, 152, 171]))
        XCTAssertNil(HeartZones(limits: [95, 114, 133, 152, 171, 190, 200]))
        XCTAssertNil(HeartZones(limits: [95, 114, 114, 152, 171, 190]))
        XCTAssertNil(HeartZones(limits: [95, 133, 114, 152, 171, 190]))
        XCTAssertNil(HeartZones(limits: [20, 114, 133, 152, 171, 190]))
        XCTAssertNil(HeartZones(limits: [95, 114, 133, 152, 171, 301]))
    }
}

final class ClimbTests: XCTestCase {
    func testNoHeightNoClimb() {
        var climb = Climb()
        XCTAssertNil(climb.metres)
        climb.add(altitudeM: nil)
        climb.add(altitudeM: .nan)
        XCTAssertNil(climb.metres)
        climb.add(altitudeM: 100)
        XCTAssertEqual(climb.metres, 0)
    }

    func testOnlyRisesOfThreeMetresCount() {
        var climb = Climb()
        // As runMetrics.test.ts: wandering by 2 m adds nothing.
        for height in [100.0, 102, 100, 101.5, 100] {
            climb.add(altitudeM: height)
        }
        XCTAssertEqual(climb.metres, 0)
        climb.add(altitudeM: 104)
        XCTAssertEqual(climb.metres, 4)
    }

    func testDescentsTakeNothingAway() {
        var climb = Climb()
        for height in [100.0, 110, 90, 95] {
            climb.add(altitudeM: height)
        }
        // 100 → 110 is 10; down to 90 counts nothing, then 90 → 95 is 5.
        XCTAssertEqual(climb.metres, 15)
    }
}

final class LiveLineTests: XCTestCase {
    /// `metres` north of the equator, about.
    func north(_ metres: Double) -> LatLon {
        LatLon(metres / 111_195, 0)
    }

    func testStandingStillAddsNothing() {
        var line = LiveLine()
        line.add(north(0))
        line.add(north(2))
        line.add(north(4))
        XCTAssertEqual(line.points.count, 1)
        line.add(north(6))
        XCTAssertEqual(line.points.count, 2)
    }

    func testALongRunKeepsTheFirstAndTheLastPoint() {
        var line = LiveLine()
        for step in 0...LiveLine.maxPoints {
            line.add(north(Double(step) * 10))
        }
        XCTAssertLessThanOrEqual(line.points.count, LiveLine.maxPoints)
        XCTAssertEqual(line.points.first, north(0))
        XCTAssertEqual(line.points.last, north(Double(LiveLine.maxPoints) * 10))
        // And it goes on from there.
        line.add(north(Double(LiveLine.maxPoints + 1) * 10))
        XCTAssertEqual(line.points.last, north(Double(LiveLine.maxPoints + 1) * 10))
    }
}
