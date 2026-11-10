import SwiftUI
import WatchKit
import WatchCore

/// The MuW app on the Apple Watch (TASK-370 part A2, ADR-0314): choose the
/// sport, start, the numbers, pause, resume, end; from part B3a, the routes
/// the phone sent. The watch never draws a route; following one is part B3b.
@main
struct MuWWatchApp: App {
    /// Woken by the phone (part B4): the workout's configuration arrives here.
    @WKApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @StateObject private var workouts: WorkoutManager
    @StateObject private var store: RouteStore

    init() {
        let store = RouteStore()
        let workouts = WorkoutManager(routes: store)
        _store = StateObject(wrappedValue: store)
        _workouts = StateObject(wrappedValue: workouts)
        AppDelegate.workouts = workouts
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(workouts)
                .environmentObject(workouts.guide)
                .environmentObject(store)
                .task {
                    await workouts.authorize()
                }
        }
    }
}

/// One screen per phase of the workout.
struct RootView: View {
    @EnvironmentObject private var workouts: WorkoutManager

    var body: some View {
        switch workouts.phase {
        case .ready:
            RoutesView()
        case .countdown:
            CountdownView()
        case .running, .paused:
            WorkoutView()
        case .finished:
            SummaryView()
        }
    }
}

/// The heart of the app's icon and the name, as at the top of the app.
struct LogoView: View {
    var body: some View {
        HStack(spacing: 6) {
            Image("MuWHeart")
                .resizable()
                .frame(width: 24, height: 24)
                .clipShape(RoundedRectangle(cornerRadius: 24 * 0.22, style: .continuous))
            // The name is the middle band of a square picture: cut to it.
            Image("MuWName")
                .renderingMode(.template)
                .resizable()
                .frame(width: 88, height: 88)
                .frame(width: 72, height: 22)
                .clipped()
        }
        .accessibilityElement()
        .accessibilityLabel(Text(verbatim: "MuW"))
    }
}

/// The sports of the watch, for a run without a route: a tap starts one.
struct SportListView: View {
    @EnvironmentObject private var workouts: WorkoutManager

    var body: some View {
        List {
            Section {
                ForEach(workouts.sports, id: \.activity) { sport in
                    Button {
                        workouts.start(sport)
                    } label: {
                        HStack(spacing: 10) {
                            Text(sport.emoji)
                                .font(.title2)
                            Text(tr(sport.name))
                                .font(.headline)
                        }
                        .padding(.vertical, 6)
                    }
                }
            } header: {
                LogoView()
                    .padding(.bottom, 4)
            }
        }
    }
}

struct CountdownView: View {
    @EnvironmentObject private var workouts: WorkoutManager

    var body: some View {
        VStack(spacing: 4) {
            Text(verbatim: "\(workouts.countdown)")
                .font(.system(size: 76, weight: .bold, design: .rounded))
                .monospacedDigit()
                .contentTransition(.numericText(countsDown: true))
                .animation(.default, value: workouts.countdown)
            Text(tr("Get ready"))
                .font(.headline)
                .foregroundStyle(.secondary)
        }
    }
}

/// The workout: the numbers on two pages, and a swipe to the controls.
struct WorkoutView: View {
    @EnvironmentObject private var workouts: WorkoutManager
    @EnvironmentObject private var guide: GuideSession
    @State private var page = 1

    var body: some View {
        TabView(selection: $page) {
            ControlsView().tag(0)
            // Along a route the arrow comes first, then the small map, then
            // the numbers (part B3b, «Freccia prima»).
            if guide.route != nil {
                GuideView().tag(1)
                RouteMapView().tag(2)
                MetricsView().tag(3)
                DetailsView().tag(4)
            } else {
                MetricsView().tag(1)
                if workouts.sport?.gps == true {
                    DetailsView().tag(2)
                }
            }
        }
        .tabViewStyle(.page)
    }
}

/// What the app writes where a number is not there yet (RunPanel's).
let noNumber = "–"

/// The numbers that change all the time: the clock, the distance, the pace
/// now and the heart.
struct MetricsView: View {
    @EnvironmentObject private var workouts: WorkoutManager
    @Environment(\.isLuminanceReduced) private var isLuminanceReduced

    var body: some View {
        TimelineView(.periodic(from: .now, by: isLuminanceReduced ? 60 : 1)) { context in
            VStack(alignment: .leading, spacing: 0) {
                if workouts.phase == .paused {
                    Text(tr("Paused"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Text(verbatim: WatchFormat.clock(ms: workouts.movingMs(at: context.date)))
                    .font(.system(size: 40, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                if let sport = workouts.sport, sport.gps {
                    Text(verbatim: WatchFormat.distance(metres: workouts.distanceM, units: workouts.units))
                        .font(.system(.title2, design: .rounded))
                        .monospacedDigit()
                    MetricRow(label: tr("Pace now"), value: paceNow(sport, at: context.date))
                } else {
                    MetricRow(label: tr("Calories"), value: calories)
                }
                HeartRow(bpm: workouts.heartRate)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func paceNow(_ sport: WatchSport, at date: Date) -> String {
        guard let pace = workouts.recentPaceS(at: date) else {
            return noNumber
        }
        return WatchFormat.pace(perKmS: pace, pace: sport.pace, units: workouts.units)
    }

    private var calories: String {
        workouts.kcal > 0 ? "\(Int(workouts.kcal.rounded())) kcal" : noNumber
    }
}

/// The numbers of the whole workout, as the second row of the app's panel:
/// the average pace, the last kilometre, the calories.
struct DetailsView: View {
    @EnvironmentObject private var workouts: WorkoutManager

    var body: some View {
        TimelineView(.periodic(from: .now, by: 5)) { context in
            VStack(alignment: .leading, spacing: 6) {
                if let sport = workouts.sport {
                    let ms = workouts.movingMs(at: context.date)
                    MetricRow(label: averageLabel(sport), value: average(sport, ms: ms))
                    MetricRow(label: splitLabel(sport), value: split(sport))
                }
                MetricRow(
                    label: tr("Calories"),
                    value: workouts.kcal > 0 ? "\(Int(workouts.kcal.rounded())) kcal" : noNumber)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func averageLabel(_ sport: WatchSport) -> String {
        switch sport.pace {
        case .km:
            return tr("Avg pace")
        case .paddle:
            return tr("Avg /500 m")
        case .swim:
            return tr("Avg /100 m")
        }
    }

    /// On the water the unit is in the name, as in the app.
    private func average(_ sport: WatchSport, ms: Int64) -> String {
        guard
            let pace = WatchFormat.pace(
                metres: workouts.distanceM, ms: ms, pace: sport.pace, units: workouts.units)
        else {
            return noNumber
        }
        return sport.pace == .km ? pace : String(pace.prefix { $0 != " " })
    }

    private func splitLabel(_ sport: WatchSport) -> String {
        switch sport.pace {
        case .km:
            return workouts.units == .mi ? tr("Last mi") : tr("Last km")
        case .paddle:
            return tr("Last 500 m")
        case .swim:
            return tr("Last 100 m")
        }
    }

    private func split(_ sport: WatchSport) -> String {
        guard let split = workouts.lastSplit else {
            return noNumber
        }
        let clock = WatchFormat.paceClock(split.seconds)
        return sport.pace == .km ? "\(clock) /\(workouts.units.rawValue)" : clock
    }
}

/// A number with its name above it, small.
struct MetricRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Text(verbatim: value)
                .font(.system(.title3, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }
}

/// The heart rate the watch measures, beats a minute.
struct HeartRow: View {
    let bpm: Int?

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 4) {
            Image(systemName: "heart.fill")
                .symbolRenderingMode(.multicolor)
            Text(verbatim: bpm.map(String.init) ?? noNumber)
                .monospacedDigit()
            Text(verbatim: "bpm")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .font(.system(.title3, design: .rounded))
    }
}

struct ControlsView: View {
    @EnvironmentObject private var workouts: WorkoutManager

    var body: some View {
        VStack(spacing: 10) {
            if workouts.phase == .paused {
                Button {
                    workouts.resume()
                } label: {
                    Label(tr("Resume"), systemImage: "play.fill")
                }
            } else {
                Button {
                    workouts.pause()
                } label: {
                    Label(tr("Pause"), systemImage: "pause.fill")
                }
            }
            Button(role: .destructive) {
                workouts.end()
            } label: {
                Label(tr("Finish"), systemImage: "stop.fill")
            }
        }
    }
}

/// What the workout was, until it is seen: Apple Health already has it.
struct SummaryView: View {
    @EnvironmentObject private var workouts: WorkoutManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                LogoView()
                if let sport = workouts.sport {
                    Text(verbatim: "\(sport.emoji) \(tr(sport.name))")
                        .font(.headline)
                }
                let ms = workouts.movingMs(at: Date())
                MetricRow(label: tr("Time"), value: WatchFormat.clock(ms: ms))
                if let sport = workouts.sport, sport.gps {
                    MetricRow(
                        label: tr("Distance"),
                        value: WatchFormat.distance(metres: workouts.distanceM, units: workouts.units))
                    MetricRow(
                        label: tr("Avg pace"),
                        value: WatchFormat.pace(
                            metres: workouts.distanceM, ms: ms, pace: sport.pace, units: workouts.units)
                            ?? noNumber)
                }
                if workouts.kcal > 0 {
                    MetricRow(label: tr("Calories"), value: "\(Int(workouts.kcal.rounded())) kcal")
                }
                Button(tr("Done")) {
                    workouts.done()
                }
                .padding(.top, 6)
            }
        }
    }
}
