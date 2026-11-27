import Foundation
import HealthKit
import WatchCore

/// The workout on the wrist (TASK-370 part A2, ADR-0314). WatchCore's
/// `Workout` says the phase and the moving time, so a command that came
/// twice, from the wrist and from the phone, counts once; HealthKit records
/// with an `HKWorkoutSession` and its `HKLiveWorkoutBuilder`, which saves
/// the workout in Apple Health at the end: one activity, one workout
/// (TASK-321). The session is mirrored to the phone, for the live heart
/// rate there.
@MainActor
final class WorkoutManager: NSObject, ObservableObject {
    @Published private(set) var workout: Workout?
    @Published private(set) var sport: WatchSport?
    /// The seconds left of the countdown.
    @Published private(set) var countdown = 0
    @Published private(set) var distanceM = 0.0
    @Published private(set) var heartRate: Int?
    @Published private(set) var kcal = 0.0
    /// The distance by moving time, for the pace now and the last
    /// kilometre.
    @Published private(set) var paces = WatchPaces()

    /// The sports of the watch, in the app's order; the swim is not one yet.
    let sports: [WatchSport] = (try? WatchSports.offered()) ?? []
    /// The units chosen on the phone (part A3), kept for the next time;
    /// until the phone says, as the app does: the watch's own measurement
    /// system.
    @Published private(set) var units: WatchUnits =
        UserDefaults.standard.string(forKey: WorkoutManager.unitsKey).flatMap(WatchUnits.init)
        ?? (Locale.current.measurementSystem == .metric ? .km : .mi)
    /// The heart rate zones of the phone (part B5), kept for the next
    /// time; none until the phone has an age or a max heart rate.
    @Published private(set) var heartZones: HeartZones? =
        (UserDefaults.standard.array(forKey: WorkoutManager.zonesKey) as? [Int])
        .flatMap(HeartZones.init(limits:))

    private let store = HKHealthStore()
    private let phone = PhoneLink()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var countdownTask: Task<Void, Never>?
    /// Woken by the phone (part B4): the wait for its start message.
    private var wakeTask: Task<Void, Never>?
    /// When the phone was last told the heart rate and the distance.
    private var heartSentAt: Int64 = 0
    /// The heart rates of the workout, for its average in the track.
    private var heartSum = 0.0
    private var heartCount = 0
    /// The route followed and when the workout started, for the track.
    private var followed: WatchRoute?
    private var startedAtMs: Int64 = 0
    /// Whether the end of the route was reached, read when the workout ends.
    private var arrived = false
    private var stateSentAt: Int64 = 0

    /// The seconds of the countdown, as the phone's.
    static let countdownSeconds = 3
    /// How often the phone hears the heart rate and the distance.
    static let sendEveryMs: Int64 = 5000
    /// Where the phone's units are kept.
    static let unitsKey = "units"
    /// Where the phone's heart rate zones are kept.
    static let zonesKey = "heartZones"

    var phase: WorkoutPhase {
        workout?.phase ?? .ready
    }

    /// Where the routes the phone sends are kept (part B3a).
    private let routes: RouteStore?
    /// The guidance along a route, on a run with one (part B3b).
    let guide = GuideSession()
    /// The positions of a workout with the GPS, for the phone and Apple
    /// Health (part B3c).
    private let recorder = TrackRecorder()
    /// The line, the arrow and the climb on the wrist (part B5).
    let live = LiveRun()

    init(routes: RouteStore? = nil) {
        self.routes = routes
        super.init()
        phone.onMessage = { [weak self] message in
            self?.receive(message)
        }
        recorder.onFix = { [weak self] fix in
            guard let self else {
                return
            }
            self.guide.follow(fix)
            if self.phase == .running {
                self.live.follow(fix)
            }
        }
    }

    /// The average heart rate of the workout so far.
    var heartAvgBpm: Int? {
        heartCount > 0 ? Int((heartSum / Double(heartCount)).rounded()) : nil
    }

    /// The zone of the heart rate now, 1 to 5, when the phone sent zones.
    var heartZone: Int? {
        guard let heartRate, let heartZones else {
            return nil
        }
        return heartZones.zone(of: heartRate)
    }

    func movingMs(at date: Date) -> Int64 {
        workout?.movingMs(at: Self.ms(date)) ?? 0
    }

    /// Seconds a kilometre over the last 200 m, as the app's "Pace now".
    func recentPaceS(at date: Date) -> Double? {
        paces.recentPaceS(
            movingNowMs: movingMs(at: date),
            standingSPerKm: sport?.pace == .swim
                ? WatchPaces.swimStandingSPerKm : WatchPaces.standingSPerKm)
    }

    /// The last whole kilometre (mile, 500 m on the water, 100 m swimming),
    /// as the app's "Last km".
    var lastSplit: WatchSplit? {
        paces.lastSplit(unitM: splitM)
    }

    var splitM: Double {
        switch sport?.pace ?? .km {
        case .km:
            return units.metres
        case .paddle:
            return 500
        case .swim:
            return 100
        }
    }

    /// What the watch asks of Apple Health, once.
    func authorize() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            return
        }
        let quantities = Self.distanceTypes.union([
            HKQuantityType(.heartRate), HKQuantityType(.activeEnergyBurned),
        ])
        // The workout's line too (part B3c): HKWorkoutRouteBuilder.
        let share: Set<HKSampleType> = Set(quantities.filter { $0 != HKQuantityType(.heartRate) })
            .union([HKObjectType.workoutType(), HKSeriesType.workoutRoute()])
        let read: Set<HKObjectType> = Set(quantities).union([HKObjectType.workoutType()])
        try? await store.requestAuthorization(toShare: share, read: read)
    }

    // MARK: From the wrist and from the phone

    /// A workout of `sport`, along `route` when there is one (part B3b).
    func start(_ sport: WatchSport, route: WatchRoute? = nil) {
        wakeTask?.cancel()
        wakeTask = nil
        var next = Workout(activity: sport.activity)
        guard phase == .ready, next.apply(.start, at: Self.now()) else {
            return
        }
        if let route {
            guide.begin(route)
        }
        followed = route
        arrived = false
        startedAtMs = Self.now()
        heartSum = 0
        heartCount = 0
        live.begin()
        if sport.gps {
            recorder.prepare(
                store: store, ride: route?.ride ?? false,
                air: sport.activity == "paragliding")
        }
        self.sport = sport
        workout = next
        distanceM = 0
        heartRate = nil
        kcal = 0
        paces = WatchPaces()
        prepareSession(for: sport)
        countdown = Self.countdownSeconds
        countdownTask = Task { [weak self] in
            for left in stride(from: Self.countdownSeconds, to: 0, by: -1) {
                self?.countdown = left
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled {
                    return
                }
            }
            self?.countdownDone()
        }
        changed()
    }

    func pause() {
        guard apply(.pause) else {
            return
        }
        session?.pause()
    }

    func resume() {
        guard apply(.resume) else {
            return
        }
        session?.resume()
    }

    /// The phone woke the app for a workout (part B4): its start message,
    /// with the app's sport, follows once the app is up. Without it within
    /// `WatchWake.waitS`, the sport of the configuration starts; a workout
    /// already on lets it go, as a second start.
    func wake(_ configuration: HKWorkoutConfiguration) {
        guard phase == .ready, wakeTask == nil else {
            return
        }
        let appleWorkout = Int(configuration.activityType.rawValue)
        let outdoor = configuration.locationType != .indoor
        wakeTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(WatchWake.waitS * 1_000_000_000))
            guard let self, !Task.isCancelled else {
                return
            }
            self.wakeTask = nil
            guard self.phase == .ready,
                let sport = WatchWake.sport(
                    appleWorkout: appleWorkout, outdoor: outdoor, among: self.sports)
            else {
                return
            }
            self.start(sport)
        }
    }

    /// The end; during the countdown it stops it, and nothing is recorded.
    func end() {
        if phase == .countdown {
            guard apply(.cancel) else {
                return
            }
            countdownTask?.cancel()
            countdownTask = nil
            guide.stop()
            recorder.discard()
            builder?.discardWorkout()
            session?.end()
            session = nil
            builder = nil
            sport = nil
            workout = nil
            return
        }
        guard apply(.end) else {
            return
        }
        arrived = guide.arrived
        guide.stop()
        recorder.stop()
        // The builder saves the workout when the session says it ended, and
        // the track goes to the phone then; without Apple Health, now.
        if let session {
            session.end()
        } else {
            sendTrack(endedAt: Date(), workout: nil)
        }
    }

    /// The summary seen: ready for the next workout.
    func done() {
        guard apply(.reset) else {
            return
        }
        workout = nil
        sport = nil
    }

    private func receive(_ message: WatchMessage) {
        switch message {
        case let .start(activity, .phone, _):
            // A sport this watch does not offer (a newer phone's) is left
            // out: the phone records it on its own.
            if let sport = sports.first(where: { $0.activity == activity }) {
                start(sport)
            }
        case let .command(command, .phone, _):
            switch command {
            case .start:
                break
            case .pause:
                pause()
            case .resume:
                resume()
            case .end:
                end()
            }
        case let .settings(chosen, zones, _):
            units = chosen
            UserDefaults.standard.set(chosen.rawValue, forKey: Self.unitsKey)
            // A phone with no age and no max heart rate says no zones.
            heartZones = zones
            UserDefaults.standard.set(zones?.limits, forKey: Self.zonesKey)
        case .route, .routes:
            routes?.receive(message)
        default:
            break
        }
    }

    // MARK: The phases

    private func countdownDone() {
        countdownTask = nil
        guard apply(.countdownDone) else {
            return
        }
        paces.add(movingMs: 0, metres: 0)
        recorder.start()
        let date = Date()
        session?.startActivity(with: date)
        builder?.beginCollection(withStart: date) { _, _ in }
    }

    /// Applies `event` to the workout and tells the phone; false when it
    /// does not apply in this phase.
    @discardableResult
    private func apply(_ event: WorkoutEvent) -> Bool {
        let at = Self.now()
        guard var next = workout, next.apply(event, at: at) else {
            return false
        }
        workout = next
        // The track leaves out the pauses, as the phone's (part B3c).
        if event == .pause {
            recorder.pause(at: at)
        } else if event == .resume {
            recorder.resume(at: at)
        }
        changed()
        return true
    }

    private func changed() {
        guard let workout else {
            return
        }
        let at = Self.now()
        stateSentAt = at
        phone.send(workout.stateMessage(from: .watch, at: at, distanceM: distanceM))
    }

    private func prepareSession(for sport: WatchSport) {
        let configuration = HKWorkoutConfiguration()
        configuration.activityType =
            HKWorkoutActivityType(rawValue: UInt(sport.appleWorkout)) ?? .other
        configuration.locationType = sport.gps ? .outdoor : .indoor
        if sport.pace == .swim {
            configuration.swimmingLocationType = .openWater
        }
        do {
            let session = try HKWorkoutSession(healthStore: store, configuration: configuration)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(
                healthStore: store, workoutConfiguration: configuration)
            session.delegate = self
            builder.delegate = self
            self.session = session
            self.builder = builder
            session.prepare()
            session.startMirroringToCompanionDevice { _, _ in }
        } catch {
            // No Apple Health (or not allowed): the clock still runs.
            session = nil
            builder = nil
        }
    }

    private func saveWorkout(endedAt date: Date) {
        guard let builder else {
            return
        }
        builder.endCollection(withEnd: date) { _, _ in
            builder.finishWorkout { workout, _ in
                Task { @MainActor [weak self] in
                    self?.sendTrack(endedAt: date, workout: workout)
                }
            }
        }
        session = nil
        self.builder = nil
    }

    /// The finished workout to the phone, as a file (part B3c): the phone
    /// shows it until it is saved or let go of. A workout without the GPS
    /// has no line, but its time, calories and heart all the same. The line
    /// goes into the workout Apple Health saved, too.
    private func sendTrack(endedAt date: Date, workout saved: HKWorkout?) {
        recorder.stop()
        recorder.finishRoute(with: saved)
        guard let sport, let workout else {
            return
        }
        let endedAtMs = Self.ms(date)
        let track = recorder.log.track(
            activity: sport.activity, startedAtMs: startedAtMs,
            endedAtMs: max(endedAtMs, startedAtMs),
            status: arrived ? .arrived : .stopped, route: followed, distanceM: distanceM,
            movingMs: workout.movingMs(at: endedAtMs), kcal: kcal > 0 ? kcal : nil,
            heartAvgBpm: heartAvgBpm)
        phone.sendTrack(track)
        followed = nil
    }

    private func collected(metres: Double?, bpm: Double?, energy: Double?) {
        if let metres {
            distanceM = metres
            if let workout {
                paces.add(movingMs: workout.movingMs(at: Self.now()), metres: metres)
            }
        }
        if let energy {
            kcal = energy
        }
        let at = Self.now()
        if let bpm {
            heartRate = Int(bpm.rounded())
            if bpm > 0 {
                heartSum += bpm
                heartCount += 1
            }
            if let rate = heartRate, rate > 0, rate <= 300, at - heartSentAt >= Self.sendEveryMs {
                heartSentAt = at
                phone.send(.heartRate(bpm: rate, at: at))
            }
        }
        if let workout, at - stateSentAt >= Self.sendEveryMs {
            stateSentAt = at
            phone.send(workout.stateMessage(from: .watch, at: at, distanceM: distanceM))
        }
    }

    /// The system paused or resumed the session (the two buttons pressed
    /// together): the same as from the screen.
    private func sessionChanged(to state: HKWorkoutSessionState, at date: Date) {
        switch state {
        case .paused where phase == .running:
            _ = apply(.pause)
        case .running where phase == .paused:
            _ = apply(.resume)
        case .ended:
            saveWorkout(endedAt: date)
        default:
            break
        }
    }

    // MARK: Units and clock

    /// The distances the watch may collect: one per kind of sport.
    nonisolated static var distanceTypes: Set<HKQuantityType> {
        var types: Set<HKQuantityType> = [
            HKQuantityType(.distanceWalkingRunning), HKQuantityType(.distanceCycling),
            HKQuantityType(.distanceSwimming), HKQuantityType(.distanceDownhillSnowSports),
        ]
        if #available(watchOS 11.0, *) {
            types.formUnion([
                HKQuantityType(.distanceCrossCountrySkiing), HKQuantityType(.distancePaddleSports),
            ])
        }
        return types
    }

    static func ms(_ date: Date) -> Int64 {
        Int64((date.timeIntervalSince1970 * 1000).rounded(.down))
    }

    static func now() -> Int64 {
        ms(Date())
    }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState, date: Date
    ) {
        Task { @MainActor in
            self.sessionChanged(to: toState, at: date)
        }
    }

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        var metres: Double?
        var bpm: Double?
        var energy: Double?
        let distances = Self.distanceTypes
        for case let type as HKQuantityType in collectedTypes {
            guard let statistics = workoutBuilder.statistics(for: type) else {
                continue
            }
            if type == HKQuantityType(.heartRate) {
                bpm = statistics.mostRecentQuantity()?.doubleValue(
                    for: HKUnit.count().unitDivided(by: .minute()))
            } else if type == HKQuantityType(.activeEnergyBurned) {
                energy = statistics.sumQuantity()?.doubleValue(for: .kilocalorie())
            } else if distances.contains(type),
                let sum = statistics.sumQuantity()?.doubleValue(for: .meter())
            {
                metres = max(metres ?? 0, sum)
            }
        }
        Task { @MainActor in
            self.collected(metres: metres, bpm: bpm, energy: energy)
        }
    }
}
