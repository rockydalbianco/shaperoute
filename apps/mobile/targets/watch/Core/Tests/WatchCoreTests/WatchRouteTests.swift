import XCTest

@testable import WatchCore

/// The routes the phone sends to follow on the watch alone (TASK-370 part
/// B3a): Fixtures/routes.json is written by the phone's watchRoute.ts
/// (scripts/watch-routes.sh), and each must read, write back, and start the
/// guidance the way the phone decided.
final class WatchRouteTests: XCTestCase {
    private func routes() throws -> [String: WatchRoute] {
        let fixtures = try XCTUnwrap(fixture("routes.json") as? [String: Any])
        var found: [String: WatchRoute] = [:]
        for entry in cases(fixtures["routes"]) {
            let name = try XCTUnwrap(entry["name"] as? String)
            found[name] = try WatchRoute.decode(entry["route"])
        }
        return found
    }

    func testEveryRouteOfThePhoneIsReadAndWrittenBack() throws {
        let fixtures = try XCTUnwrap(fixture("routes.json") as? [String: Any])
        let entries = cases(fixtures["routes"])
        XCTAssertEqual(entries.count, 3)
        for entry in entries {
            let json = try XCTUnwrap(entry["route"] as? [String: Any])
            let route = try WatchRoute.decode(json)
            XCTAssertEqual(
                NSDictionary(dictionary: route.encoded()), NSDictionary(dictionary: json),
                entry["name"] as? String ?? "?")
            XCTAssertEqual(try WatchRoute.decode(route.encoded()), route)
        }
    }

    func testARunStartsAtItsStartAndTellsItsDeparture() throws {
        let run = try XCTUnwrap(try routes()["a run with its directions"])
        let (navigation, cues, pen) = run.start()
        XCTAssertFalse(navigation.waitingToJoin)
        XCTAssertEqual(navigation.announceM, 50)
        XCTAssertEqual(cues, [.depart(index: 0)])
        XCTAssertNil(pen)
        XCTAssertFalse(run.directions.isEmpty)
    }

    func testAWordByBikeLiftsThePenAndTellsTurnsFurtherAhead() throws {
        let word = try XCTUnwrap(try routes()["a word by bike with the pen up"])
        let (navigation, _, pen) = word.start()
        XCTAssertEqual(navigation.announceM, 100)
        let drawing = try XCTUnwrap(pen)
        XCTAssertTrue(drawing.ride)
        XCTAssertFalse(drawing.parts)
        XCTAssertEqual(drawing.walks.map(\.letter), ["O"])
        XCTAssertEqual(drawing.walks[0].fromM, navigation.along[2], accuracy: 1e-9)
    }

    func testAClosedSwimWaitsToBeJoined() throws {
        let swim = try XCTUnwrap(try routes()["a closed swim without directions"])
        let (navigation, cues, pen) = swim.start()
        XCTAssertTrue(navigation.waitingToJoin)
        XCTAssertEqual(cues, [])
        XCTAssertNil(pen)
    }

    func testARouteMessageCarriesItsRoute() throws {
        let run = try XCTUnwrap(try routes()["a run with its directions"])
        let message = WatchMessage.route(run, favorite: true, at: 42)
        XCTAssertEqual(try WatchMessage.decode(message.encoded()), message)
        let keys = WatchMessage.routes(favorites: [run.key], at: 43)
        XCTAssertEqual(try WatchMessage.decode(keys.encoded()), keys)
    }

    func testAWalkThatDoesNotFitIsRefused() throws {
        let word = try XCTUnwrap(try routes()["a word by bike with the pen up"])
        var fields = word.encoded()
        fields["walks"] = [[5, 2]]
        XCTAssertThrowsError(try WatchRoute.decode(fields))
        fields["walks"] = [[2, 99]]
        XCTAssertThrowsError(try WatchRoute.decode(fields))
        fields["walks"] = [[2, 5], [4, 6]]
        XCTAssertThrowsError(try WatchRoute.decode(fields))
    }
}
