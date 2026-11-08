import XCTest

@testable import WatchCore

/// The edges of StartAnywhere that the guide traces cross only once or not
/// at all (TASK-370 part B2): the traces keep the rest alike with the phone.
final class LoopTests: XCTestCase {
    func testARouteIsClosedWhenItEndsWithin25MetresOfItsStart() {
        let start = LatLon(46.0, 11.0)
        let north = { (m: Double) in LatLon(46.0 + m / 111_195, 11.0) }
        XCTAssertTrue(StartAnywhere.isClosed([start, north(500), north(20)]))
        XCTAssertFalse(StartAnywhere.isClosed([start, north(500), north(30)]))
        XCTAssertFalse(StartAnywhere.isClosed([start, start]))
    }

    func testAWordOrARouteInPiecesStartsAtItsStart() {
        let closed = [LatLon(46.0, 11.0), LatLon(46.005, 11.0), LatLon(46.0, 11.0)]
        XCTAssertTrue(StartAnywhere.startsAnywhere(closed, word: nil, walks: 0))
        XCTAssertTrue(StartAnywhere.startsAnywhere(closed, word: "", walks: 0))
        XCTAssertFalse(StartAnywhere.startsAnywhere(closed, word: "O", walks: 0))
        XCTAssertFalse(StartAnywhere.startsAnywhere(closed, word: nil, walks: 1))
    }

    func testTurnsAreNamedAsTheEngineNamesThem() {
        XCTAssertEqual(StartAnywhere.turnOf(30), "straight")
        XCTAssertEqual(StartAnywhere.turnOf(-31), "left")
        XCTAssertEqual(StartAnywhere.turnOf(90), "right")
        XCTAssertEqual(StartAnywhere.turnOf(135), "sharp-right")
        XCTAssertEqual(StartAnywhere.turnOf(-140), "sharp-left")
        XCTAssertEqual(StartAnywhere.turnOf(165), "u-turn")
        XCTAssertEqual(StartAnywhere.turnOf(-180), "u-turn")
    }

    func testAnglesWrapIntoTheHalfOpenCircle() {
        XCTAssertEqual(StartAnywhere.signed(190), -170, accuracy: 1e-9)
        XCTAssertEqual(StartAnywhere.signed(-190), 170, accuracy: 1e-9)
        XCTAssertEqual(StartAnywhere.signed(180), 180)
        XCTAssertEqual(StartAnywhere.signed(-180), 180)
        XCTAssertEqual(StartAnywhere.signed(540), 180)
    }

    func testARoadOfTwoNamesIsTwoNamesOnce() {
        XCTAssertEqual(StartAnywhere.namesOf("Via Roma / SS47 / Via Roma"), ["Via Roma", "SS47"])
        XCTAssertEqual(StartAnywhere.namesOf(nil), [])
        XCTAssertEqual(StartAnywhere.namesOf(""), [])
    }
}
