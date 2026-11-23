import SwiftUI
import WatchCore

/// The first screen of the watch (TASK-370 part B3a, the user's choice
/// «Pulsante e preferiti»): «Run without a route», which opens the sports,
/// then the routes the phone sent, newest first, the favorites with a
/// heart. A route starts its sport's workout along it, with the arrow and
/// the vibrations (part B3b).
struct RoutesView: View {
    @EnvironmentObject private var workouts: WorkoutManager
    @EnvironmentObject private var store: RouteStore

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        SportListView()
                    } label: {
                        Text(tr("Run without a route"))
                            .font(.headline)
                            .padding(.vertical, 6)
                    }
                } header: {
                    LogoView()
                        .padding(.bottom, 4)
                }
                Section(tr("Routes")) {
                    if store.routes.isEmpty {
                        Text(tr("Send a route from MuW on your iPhone"))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    ForEach(store.routes, id: \.route.key) { kept in
                        Button {
                            start(kept.route)
                        } label: {
                            RouteRow(kept: kept, units: workouts.units, sport: sport(of: kept.route))
                        }
                        .disabled(sport(of: kept.route) == nil)
                    }
                }
            }
        }
    }

    /// The sport of a route, when this watch offers it (a newer phone's
    /// may not be one yet).
    private func sport(of route: WatchRoute) -> WatchSport? {
        workouts.sports.first { $0.activity == route.activity }
    }

    private func start(_ route: WatchRoute) {
        if let sport = sport(of: route) {
            workouts.start(sport, route: route)
        }
    }
}

/// A route of the list: the sport, what it draws, how long, a heart for a
/// favorite.
struct RouteRow: View {
    let kept: KeptRoute
    let units: WatchUnits
    let sport: WatchSport?

    var body: some View {
        HStack(spacing: 10) {
            Text(sport?.emoji ?? "•")
                .font(.title3)
            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: kept.route.title)
                    .font(.headline)
                    .lineLimit(1)
                Text(verbatim: WatchFormat.distance(metres: kept.route.distanceM, units: units))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
            Spacer(minLength: 0)
            if kept.favorite {
                Text(verbatim: "♥︎")
                    .foregroundStyle(.red)
                    .accessibilityLabel(Text(tr("Favorites")))
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
