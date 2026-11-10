import ActivityKit
import ExpoModulesCore
import Foundation

/// The run's directions on the lock screen and in the Dynamic Island
/// (TASK-401 part B, ADR-0335). The app writes what to show; the widget in
/// targets/live-activity lays it out. One activity at a time.
public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MuWLiveActivity")

    /// Whether this phone shows Live Activities, and the user allows them.
    Function("isAvailable") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    /// Starts the run's activity, ending any left over by a run before.
    AsyncFunction("start") { (colorsJson: String, stateJson: String) async throws -> Bool in
      guard #available(iOS 16.2, *) else {
        return false
      }
      let colors = try Self.decode(Colors.self, colorsJson)
      let state = try Self.decode(MuWRunAttributes.ContentState.self, stateJson)
      for leftOver in Activity<MuWRunAttributes>.activities {
        await leftOver.end(nil, dismissalPolicy: .immediate)
      }
      let attributes = MuWRunAttributes(
        accent: colors.accent,
        onAccent: colors.onAccent,
        surface: colors.surface,
        text: colors.text,
        textMuted: colors.textMuted,
        warning: colors.warning
      )
      do {
        _ = try Activity.request(
          attributes: attributes,
          content: ActivityContent(state: state, staleDate: nil),
          pushType: nil
        )
        return true
      } catch {
        return false
      }
    }

    /// What the activity shows now.
    AsyncFunction("update") { (stateJson: String) async throws in
      guard #available(iOS 16.2, *) else {
        return
      }
      let state = try Self.decode(MuWRunAttributes.ContentState.self, stateJson)
      for activity in Activity<MuWRunAttributes>.activities {
        await activity.update(ActivityContent(state: state, staleDate: nil))
      }
    }

    /// Ends it with its last words, gone after `dismissAfterSeconds`, or at
    /// once with 0.
    AsyncFunction("end") { (stateJson: String, dismissAfterSeconds: Double) async throws in
      guard #available(iOS 16.2, *) else {
        return
      }
      let state = try Self.decode(MuWRunAttributes.ContentState.self, stateJson)
      let policy: ActivityUIDismissalPolicy =
        dismissAfterSeconds > 0
        ? .after(Date().addingTimeInterval(dismissAfterSeconds))
        : .immediate
      for activity in Activity<MuWRunAttributes>.activities {
        await activity.end(ActivityContent(state: state, staleDate: nil), dismissalPolicy: policy)
      }
    }
  }

  struct Colors: Codable {
    var accent: String
    var onAccent: String
    var surface: String
    var text: String
    var textMuted: String
    var warning: String
  }

  static func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
    return try JSONDecoder().decode(type, from: Data(json.utf8))
  }
}
