import Foundation

/// The version of the messages between the phone and the watch (TASK-370
/// part A1). Every message says its `v`; a side reads the versions up to its
/// own and refuses a newer one, since the watch app is not updated by an
/// OTA. A later version only adds fields: the ones a side does not know are
/// left out. The phone has the same rules (src/watch/watchMessages.ts), and
/// both read Fixtures/messages.json.
public let watchProtocolVersion = 1

/// Who sent a message.
public enum WatchSide: String, Sendable {
    case phone
    case watch
}

/// What either side asks of the workout.
public enum WatchCommand: String, CaseIterable, Sendable {
    case start
    case pause
    case resume
    case end
}

/// A message between the phone and the watch, as WatchConnectivity carries
/// it: a dictionary of JSON values. Times are milliseconds since 1970,
/// distances metres.
public enum WatchMessage: Equatable, Sendable {
    /// A start says the sport: an activity of the app ("running"), which a
    /// watch older than the phone may not know.
    case start(activity: String, from: WatchSide, at: Int64)
    case command(WatchCommand, from: WatchSide, at: Int64)
    /// Where the workout of `from` is, sent at each change and now and then.
    case state(
        phase: WorkoutPhase, activity: String, from: WatchSide, at: Int64,
        movingMs: Int64, distanceM: Double)
    /// The heart rate the watch measures, beats per minute.
    case heartRate(bpm: Int, at: Int64)
}

/// Why a message was not read: the same codes as the phone's.
public enum WatchMessageError: String, Error, Sendable {
    case notAnObject
    case unsupportedVersion
    case unknownType
    case invalidField
}

extension WatchMessage {
    /// The message in `object`, a dictionary from WatchConnectivity or from
    /// JSONSerialization.
    public static func decode(_ object: Any) throws -> WatchMessage {
        guard let fields = object as? [String: Any] else {
            throw WatchMessageError.notAnObject
        }
        guard let version = integer(fields["v"]), version >= 1 else {
            throw WatchMessageError.invalidField
        }
        guard version <= Int64(watchProtocolVersion) else {
            throw WatchMessageError.unsupportedVersion
        }
        guard let type = fields["type"] as? String else {
            throw WatchMessageError.invalidField
        }
        switch type {
        case "command":
            let from = try side(fields["from"])
            let at = try time(fields["at"])
            guard let name = fields["command"] as? String,
                let command = WatchCommand(rawValue: name)
            else {
                throw WatchMessageError.invalidField
            }
            if command == .start {
                return .start(activity: try activity(fields["activity"]), from: from, at: at)
            }
            return .command(command, from: from, at: at)
        case "state":
            guard let name = fields["phase"] as? String,
                let phase = WorkoutPhase(rawValue: name),
                let movingMs = integer(fields["movingMs"]), movingMs >= 0,
                let distanceM = real(fields["distanceM"]), distanceM >= 0
            else {
                throw WatchMessageError.invalidField
            }
            return .state(
                phase: phase, activity: try activity(fields["activity"]),
                from: try side(fields["from"]), at: try time(fields["at"]),
                movingMs: movingMs, distanceM: distanceM)
        case "heartRate":
            guard let bpm = integer(fields["bpm"]), bpm > 0, bpm <= 300 else {
                throw WatchMessageError.invalidField
            }
            return .heartRate(bpm: Int(bpm), at: try time(fields["at"]))
        default:
            throw WatchMessageError.unknownType
        }
    }

    /// The message from the bytes of a JSON object.
    public static func decode(json data: Data) throws -> WatchMessage {
        guard let object = try? JSONSerialization.jsonObject(with: data) else {
            throw WatchMessageError.notAnObject
        }
        return try decode(object)
    }

    /// The message as a dictionary of JSON values, for WatchConnectivity.
    public func encoded() -> [String: Any] {
        var fields: [String: Any] = ["v": watchProtocolVersion]
        switch self {
        case let .start(activity, from, at):
            fields["type"] = "command"
            fields["command"] = WatchCommand.start.rawValue
            fields["activity"] = activity
            fields["from"] = from.rawValue
            fields["at"] = at
        case let .command(command, from, at):
            fields["type"] = "command"
            fields["command"] = command.rawValue
            fields["from"] = from.rawValue
            fields["at"] = at
        case let .state(phase, activity, from, at, movingMs, distanceM):
            fields["type"] = "state"
            fields["phase"] = phase.rawValue
            fields["activity"] = activity
            fields["from"] = from.rawValue
            fields["at"] = at
            fields["movingMs"] = movingMs
            fields["distanceM"] = distanceM
        case let .heartRate(bpm, at):
            fields["type"] = "heartRate"
            fields["bpm"] = bpm
            fields["at"] = at
        }
        return fields
    }
}

// JSONSerialization and WatchConnectivity give numbers as NSNumber, and a
// JSON true is one too: it is not a number here.
private func number(_ value: Any?) -> Double? {
    guard let value = value as? NSNumber,
        CFGetTypeID(value) != CFBooleanGetTypeID()
    else {
        return nil
    }
    let real = value.doubleValue
    return real.isFinite ? real : nil
}

/// A whole number, also when written as 12.0, as the phone's
/// Number.isInteger reads it.
private func integer(_ value: Any?) -> Int64? {
    guard let real = number(value), real.rounded() == real,
        abs(real) < 9_007_199_254_740_992
    else {
        return nil
    }
    return Int64(real)
}

private func real(_ value: Any?) -> Double? {
    number(value)
}

private func time(_ value: Any?) throws -> Int64 {
    guard let at = integer(value), at >= 0 else {
        throw WatchMessageError.invalidField
    }
    return at
}

private func side(_ value: Any?) throws -> WatchSide {
    guard let name = value as? String, let side = WatchSide(rawValue: name) else {
        throw WatchMessageError.invalidField
    }
    return side
}

private func activity(_ value: Any?) throws -> String {
    guard let activity = value as? String, !activity.isEmpty else {
        throw WatchMessageError.invalidField
    }
    return activity
}
