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
    /// As the app does until one is chosen: the watch's own measurement
    /// system. The phone's choice reaches the watch in part A3.
    let units: WatchUnits = Locale.current.measurementSystem == .metric ? .km : .mi

    private let store = HKHealthStore()
    private let phone = PhoneLink()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var countdownTask: Task<Void, Never>?
    /// When the phone was last told the heart rate and the distance.
    private var heartSentAt: Int64 = 0
    private var stateSentAt: Int64 = 0

    /// The seconds of the countdown, as the phone's.
    static let countdownSeconds = 3
    /// How often the phone hears the heart rate and the distance.
    static let sendEveryMs: Int64 = 5000

    var phase: WorkoutPhase {
        workout?.phase ?? .ready
    }

    override init() {
        super.init()
        phone.onMessage = { [weak self] message in
            self?.receive(message)
        }
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
        let share: Set<HKSampleType> = Set(quantities.filter { $0 != HKQuantityType(.heartRate) })
            .union([HKObjectType.workoutType()])
        let read: Set<HKObjectType> = Set(quantities).union([HKObjectType.workoutType()])
        try? await store.requestAuthorization(toShare: share, read: read)
    }

    // MARK: From the wrist and from the phone

    func start(_ sport: WatchSport) {
        var next = Workout(activity: sport.activity)
        guard phase == .ready, next.apply(.start, at: Self.now()) else {
            return
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

    /// The end; during the countdown it stops it, and nothing is recorded.
    func end() {
        if phase == .countdown {
            guard apply(.cancel) else {
                return
            }
            countdownTask?.cancel()
            countdownTask = nil
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
        // The builder saves the workout when the session says it ended.
        session?.end()
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
        let date = Date()
        session?.startActivity(with: date)
        builder?.beginCollection(withStart: date) { _, _ in }
    }

    /// Applies `event` to the workout and tells the phone; false when it
    /// does not apply in this phase.
    @discardableResult
    private func apply(_ event: WorkoutEvent) -> Bool {
        guard var next = workout, next.apply(event, at: Self.now()) else {
            return false
        }
        workout = next
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
            builder.finishWorkout { _, _ in }
        }
        session = nil
        self.builder = nil
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
