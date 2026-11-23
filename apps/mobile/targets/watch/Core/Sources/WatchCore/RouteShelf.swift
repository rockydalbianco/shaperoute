import Foundation

/// A route the watch keeps, as the phone sent it.
public struct KeptRoute: Equatable, Sendable {
    public var route: WatchRoute
    public var favorite: Bool
    /// When the phone sent it, milliseconds since 1970.
    public var sentAt: Int64
}

/// The routes on the watch (TASK-370 part B3a, the user's choice «Pulsante e
/// preferiti»): every favorite, and the last `recentKept` sent with «Send to
/// watch», newest first. A route sent again, by its key, replaces the one
/// kept and comes first; a favorite no longer among the phone's goes back
/// among the recent ones, and out when there are too many. Pure: the app
/// keeps it on disk (`encoded()`).
public struct RouteShelf: Equatable, Sendable {
    /// The phone's WATCH_ROUTES_KEPT.
    public static let recentKept = 20

    public private(set) var routes: [KeptRoute]

    public init(routes: [KeptRoute] = []) {
        self.routes = routes
        trim()
    }

    /// The shelf after a message of the phone; any message but a route or
    /// the favorites' keys changes nothing.
    public mutating func receive(_ message: WatchMessage) {
        switch message {
        case let .route(route, favorite, at):
            routes.removeAll { $0.route.key == route.key }
            routes.insert(KeptRoute(route: route, favorite: favorite, sentAt: at), at: 0)
        case let .routes(favorites, _):
            let keys = Set(favorites)
            for i in routes.indices {
                routes[i].favorite = keys.contains(routes[i].route.key)
            }
        default:
            return
        }
        trim()
    }

    /// The favorites all, the others up to `recentKept`, in their order.
    private mutating func trim() {
        var recent = 0
        routes = routes.filter { kept in
            if kept.favorite {
                return true
            }
            recent += 1
            return recent <= Self.recentKept
        }
    }

    /// The shelf as the app keeps it on disk: JSON values.
    public func encoded() -> [[String: Any]] {
        routes.map { ["route": $0.route.encoded(), "favorite": $0.favorite, "sentAt": $0.sentAt] }
    }

    /// The shelf kept on disk; a route that no longer reads is left out.
    public static func decode(_ value: Any?) -> RouteShelf {
        let entries = value as? [Any] ?? []
        let routes = entries.compactMap { entry -> KeptRoute? in
            guard let fields = entry as? [String: Any],
                let route = try? WatchRoute.decode(fields["route"]),
                let favorite = boolean(fields["favorite"]),
                let sentAt = integer(fields["sentAt"])
            else {
                return nil
            }
            return KeptRoute(route: route, favorite: favorite, sentAt: sentAt)
        }
        return RouteShelf(routes: routes)
    }
}
