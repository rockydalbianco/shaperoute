import XCTest

@testable import WatchCore

final class WatchPacesTests: XCTestCase {
    /// A steady 5:00 a kilometre, a sample every 10 s.
    private func steady(seconds: Int) -> WatchPaces {
        var paces = WatchPaces()
        for second in stride(from: 0, through: seconds, by: 10) {
            paces.add(movingMs: Int64(second) * 1000, metres: Double(second) * (1000.0 / 300))
        }
        return paces
    }

    func testNoPaceBeforeAHundredMetres() {
        let paces = steady(seconds: 20)
        XCTAssertNil(paces.recentPaceS(movingNowMs: 20_000))
    }

    func testThePaceNowIsOfTheLastTwoHundredMetres() throws {
        var paces = steady(seconds: 600)
        // The last 300 m at 4:00 a kilometre: the pace now follows it.
        let start = paces.samples.last!
        for step in 1...8 {
            paces.add(
                movingMs: start.movingMs + Int64(step) * 9000,
                metres: start.metres + Double(step) * 37.5)
        }
        let pace = try XCTUnwrap(paces.recentPaceS(movingNowMs: paces.samples.last!.movingMs))
        XCTAssertEqual(pace, 240, accuracy: 1)
    }

    func testStandingStillSlowsThePaceThenHidesIt() throws {
        let paces = steady(seconds: 300)
        let now = paces.samples.last!.movingMs
        let moving = try XCTUnwrap(paces.recentPaceS(movingNowMs: now))
        XCTAssertEqual(moving, 300, accuracy: 0.5)
        let slower = try XCTUnwrap(paces.recentPaceS(movingNowMs: now + 60_000))
        XCTAssertGreaterThan(slower, moving)
        XCTAssertNil(paces.recentPaceS(movingNowMs: now + 600_000))
        // A swim stands only much slower.
        XCTAssertNotNil(
            paces.recentPaceS(
                movingNowMs: now + 600_000, standingSPerKm: WatchPaces.swimStandingSPerKm))
    }

    func testOnlyAStepForwardIsKept() {
        var paces = WatchPaces()
        paces.add(movingMs: 0, metres: 0)
        paces.add(movingMs: 10_000, metres: 30)
        paces.add(movingMs: 12_000, metres: 25)
        paces.add(movingMs: 9_000, metres: 40)
        paces.add(movingMs: 14_000, metres: 30)
        XCTAssertEqual(paces.samples.map(\.metres), [0, 30])
    }

    func testTheLastWholeKilometre() throws {
        XCTAssertNil(steady(seconds: 290).lastSplit())
        let first = try XCTUnwrap(steady(seconds: 320).lastSplit())
        XCTAssertEqual(first.number, 1)
        XCTAssertEqual(first.seconds, 300, accuracy: 0.01)
        var paces = steady(seconds: 600)
        let start = paces.samples.last!
        // The third kilometre at 4:00.
        paces.add(movingMs: start.movingMs + 240_000, metres: start.metres + 1000)
        let third = try XCTUnwrap(paces.lastSplit())
        XCTAssertEqual(third.number, 3)
        XCTAssertEqual(third.seconds, 240, accuracy: 0.01)
    }

    func testTheEndOfAKilometreFallsBetweenSamples() throws {
        var paces = WatchPaces()
        paces.add(movingMs: 0, metres: 0)
        paces.add(movingMs: 290_000, metres: 900)
        paces.add(movingMs: 330_000, metres: 1100)
        let split = try XCTUnwrap(paces.lastSplit())
        XCTAssertEqual(split.seconds, 310, accuracy: 0.01)
    }

    func testAMile() throws {
        let paces = steady(seconds: 600)
        let mile = try XCTUnwrap(paces.lastSplit(unitM: WatchUnits.mi.metres))
        XCTAssertEqual(mile.number, 1)
        XCTAssertEqual(mile.seconds, 300 * 1.609344, accuracy: 0.01)
    }
}
