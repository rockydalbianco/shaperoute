import XCTest

@testable import WatchCore

/// The routes kept on the watch (TASK-370 part B3a): every favorite and the
/// last 20 sent.
final class RouteShelfTests: XCTestCase {
    private func route(_ key: String) -> WatchRoute {
        WatchRoute(
            key: key, title: key, activity: "running", distanceM: 1000,
            points: [LatLon(46, 11), LatLon(46.001, 11)], directions: [], walks: [],
            word: nil, anywhere: false, ride: false, paddle: false, announceM: 50)
    }

    private func keys(_ shelf: RouteShelf) -> [String] {
        shelf.routes.map(\.route.key)
    }

    func testANewRouteComesFirstAndTheSameRouteReplacesItself() {
        var shelf = RouteShelf()
        shelf.receive(.route(route("a"), favorite: false, at: 1))
        shelf.receive(.route(route("b"), favorite: false, at: 2))
        XCTAssertEqual(keys(shelf), ["b", "a"])
        shelf.receive(.route(route("a"), favorite: false, at: 3))
        XCTAssertEqual(keys(shelf), ["a", "b"])
        XCTAssertEqual(shelf.routes[0].sentAt, 3)
    }

    func testOnlyTheLast20AreKeptBesidesTheFavorites() {
        var shelf = RouteShelf()
        shelf.receive(.route(route("fav"), favorite: true, at: 0))
        for i in 1...25 {
            shelf.receive(.route(route("r\(i)"), favorite: false, at: Int64(i)))
        }
        XCTAssertEqual(shelf.routes.count, 21)
        XCTAssertTrue(keys(shelf).contains("fav"))
        XCTAssertEqual(keys(shelf).first, "r25")
        XCTAssertFalse(keys(shelf).contains("r5"))
        XCTAssertTrue(keys(shelf).contains("r6"))
    }

    func testAFavoriteNoLongerAmongThePhonesGoesBackAmongTheRecentOnes() {
        var shelf = RouteShelf()
        shelf.receive(.route(route("old"), favorite: true, at: 0))
        for i in 1...20 {
            shelf.receive(.route(route("r\(i)"), favorite: false, at: Int64(i)))
        }
        shelf.receive(.routes(favorites: ["old"], at: 21))
        XCTAssertEqual(shelf.routes.count, 21)
        // No longer a favorite, it is the oldest of 21 recent ones: out.
        shelf.receive(.routes(favorites: [], at: 22))
        XCTAssertEqual(shelf.routes.count, 20)
        XCTAssertFalse(keys(shelf).contains("old"))
    }

    func testTheFavoritesKeysMarkTheRoutesKept() {
        var shelf = RouteShelf()
        shelf.receive(.route(route("a"), favorite: false, at: 1))
        shelf.receive(.routes(favorites: ["a", "unknown"], at: 2))
        XCTAssertEqual(shelf.routes.map(\.favorite), [true])
    }

    func testOtherMessagesChangeNothing() {
        var shelf = RouteShelf()
        shelf.receive(.route(route("a"), favorite: false, at: 1))
        let before = shelf
        shelf.receive(.heartRate(bpm: 120, at: 2))
        XCTAssertEqual(shelf, before)
    }

    func testTheShelfIsKeptOnDiskAndReadBack() {
        var shelf = RouteShelf()
        shelf.receive(.route(route("a"), favorite: true, at: 1))
        shelf.receive(.route(route("b"), favorite: false, at: 2))
        let data = try? JSONSerialization.data(withJSONObject: shelf.encoded())
        let read = RouteShelf.decode(data.flatMap { try? JSONSerialization.jsonObject(with: $0) })
        XCTAssertEqual(read, shelf)
        XCTAssertEqual(RouteShelf.decode(["nonsense", ["route": 3]]), RouteShelf())
    }
}
