import ActivityKit
import SwiftUI
import WidgetKit

// The run's directions on the lock screen and in the Dynamic Island
// (TASK-401 part B, ADR-0335, the user's «Solo la guida»): the turn's arrow,
// the way to it, the banner's words, and a bar with the drawing done and the
// way left. The app writes every word and colour (LiveActivityModule); this
// only lays them out.

@main
struct MuWLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    RunLiveActivity()
  }
}

struct RunLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: MuWRunAttributes.self) { context in
      LockScreenView(colors: context.attributes, state: context.state)
        .activityBackgroundTint(Color(hex: context.attributes.surface))
        .activitySystemActionForegroundColor(Color(hex: context.attributes.text))
    } dynamicIsland: { context in
      let colors = context.attributes
      let state = context.state
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Sign(colors: colors, state: state, size: 44)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(compactTrailing(state))
            .font(.title2.weight(.bold))
            .foregroundColor(Color(hex: colors.accent))
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            Text(state.instruction)
              .font(.headline)
              .foregroundColor(.white)
              .lineLimit(2)
            Progress(colors: colors, state: state, onDark: true)
          }
          // Off the island's round corners.
          .padding(.horizontal, 8)
        }
      } compactLeading: {
        Text(state.sign)
          .font(.headline.weight(.bold))
          .foregroundColor(signColor(colors, state))
      } compactTrailing: {
        Text(compactTrailing(state))
          .font(.headline.weight(.semibold))
          .foregroundColor(Color(hex: colors.accent))
      } minimal: {
        Text(state.sign)
          .font(.headline.weight(.bold))
          .foregroundColor(signColor(colors, state))
      }
      .keylineTint(Color(hex: colors.accent))
    }
  }
}

/// The way to the turn; with no turn ahead, how much is drawn ("62%").
func compactTrailing(_ state: MuWRunAttributes.ContentState) -> String {
  return state.distance.isEmpty ? "\(Int((state.done * 100).rounded()))%" : state.distance
}

/// Off the route the sign is a warning; on it, the route's yellow.
func signColor(_ colors: MuWRunAttributes, _ state: MuWRunAttributes.ContentState) -> Color {
  return Color(hex: state.off ? colors.warning : colors.accent)
}

struct LockScreenView: View {
  let colors: MuWRunAttributes
  let state: MuWRunAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .center, spacing: 14) {
        Sign(colors: colors, state: state, size: 52)
        VStack(alignment: .leading, spacing: 2) {
          if !state.distance.isEmpty {
            Text(state.distance)
              .font(.title.weight(.bold))
              .foregroundColor(Color(hex: colors.text))
          }
          Text(state.instruction)
            .font(.headline)
            .foregroundColor(Color(hex: colors.text))
            .lineLimit(2)
        }
        Spacer(minLength: 0)
      }
      Progress(colors: colors, state: state, onDark: false)
    }
    .padding(16)
  }
}

/// The arrow in a round badge of the route's yellow.
struct Sign: View {
  let colors: MuWRunAttributes
  let state: MuWRunAttributes.ContentState
  let size: CGFloat

  var body: some View {
    Text(state.sign)
      .font(.system(size: size * 0.55, weight: .bold))
      .foregroundColor(Color(hex: colors.onAccent))
      .frame(width: size, height: size)
      .background(Circle().fill(signColor(colors, state)))
      .accessibilityHidden(true)
  }
}

/// The bar of the drawing done, with "42% drawn" and "350 m left" under it.
struct Progress: View {
  let colors: MuWRunAttributes
  let state: MuWRunAttributes.ContentState
  let onDark: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      ProgressView(value: min(max(state.done, 0), 1))
        .tint(Color(hex: colors.accent))
      HStack {
        Text(state.drawn)
        Spacer()
        Text(state.left)
      }
      .font(.caption.weight(.semibold))
      .foregroundColor(onDark ? .white : Color(hex: colors.textMuted))
    }
  }
}

extension Color {
  /// "#RRGGBB", as src/theme/tokens.ts writes them.
  init(hex: String) {
    let digits = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    var value: UInt64 = 0
    Scanner(string: digits).scanHexInt64(&value)
    self.init(
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255
    )
  }
}
