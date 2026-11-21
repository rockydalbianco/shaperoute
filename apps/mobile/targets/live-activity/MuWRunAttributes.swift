import ActivityKit

// The same type as modules/live-activity/ios/MuWRunAttributes.swift: ActivityKit
// matches the app's activity with the widget's by this name and these
// fields. The two binaries share no code, so a change here goes there too.
struct MuWRunAttributes: ActivityAttributes {
  /// What the lock screen shows, written by the app in its language and
  /// units: the widget only lays it out.
  public struct ContentState: Codable, Hashable {
    /// The turn's arrow, "⚠" off the route, "✓" at the end.
    var sign: String
    /// "50 m", "400 ft": the way to the turn, or back to the route.
    var distance: String
    /// "Turn right onto Via Verdi", the banner's words.
    var instruction: String
    /// The share of the drawing done, 0 to 1.
    var done: Double
    /// "42% drawn".
    var drawn: String
    /// "350 m left".
    var left: String
    var arrived: Bool
    var off: Bool
  }

  /// The app's colours (src/theme/tokens.ts), as "#RRGGBB".
  var accent: String
  var onAccent: String
  var surface: String
  var text: String
  var textMuted: String
  var warning: String
}
