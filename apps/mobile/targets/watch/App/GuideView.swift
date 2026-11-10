import SwiftUI
import WatchCore

/// The first page of a run with a route (TASK-370 part B3b, the user's
/// choice «Freccia prima»): a big arrow, the metres, the road; off the route
/// the arrow turns towards it. The words of the turns are left out: the
/// arrow says them, in every language.
struct GuideView: View {
    @EnvironmentObject private var guide: GuideSession
    @EnvironmentObject private var workouts: WorkoutManager

    var body: some View {
        if let screen = guide.screen {
            page(screen)
        }
    }

    private func page(_ screen: GuideScreen) -> some View {
        VStack(spacing: 4) {
            if let title = title(screen) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(screen.mode == .offRoute ? .red : .primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }
            if screen.mode == .arrived {
                Image(systemName: "flag.checkered")
                    .font(.system(size: 64, weight: .bold))
            } else if let arrow = screen.arrowDeg {
                Image(systemName: "arrow.up")
                    .font(.system(size: 72, weight: .heavy))
                    .rotationEffect(.degrees(arrow))
                    .foregroundStyle(screen.mode == .offRoute ? .red : .yellow)
                    .animation(.easeInOut(duration: 0.3), value: arrow)
                    .accessibilityHidden(true)
            }
            if let metres = screen.metres {
                Text(verbatim: Self.short(metres, units: workouts.units))
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .monospacedDigit()
            }
            if let street = screen.street, screen.mode == .following {
                Text(verbatim: street)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            if let pen = screen.pen {
                Text(penText(pen))
                    .font(.footnote.bold())
                    .foregroundStyle(.yellow)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
    }

    private func title(_ screen: GuideScreen) -> String? {
        switch screen.mode {
        case .waiting:
            return tr("Reach the route to start")
        case .offRoute:
            return tr("Off route")
        case .arrived:
            return tr("Arrived")
        case .following:
            return nil
        }
    }

    private func penText(_ pen: GuideScreen.PenNote) -> String {
        switch pen {
        case let .toLetter(letter):
            return tr("To the {letter}").replacingOccurrences(of: "{letter}", with: letter)
        case .nextPart:
            return tr("Next part")
        }
    }

    /// Metres as a turn is told: whole metres up to a kilometre, then the
    /// kilometres; feet up to a tenth of a mile, then the miles.
    static func short(_ metres: Double, units: WatchUnits) -> String {
        switch units {
        case .km:
            return metres < 1000
                ? "\(Int(metres.rounded())) m"
                : WatchFormat.distance(metres: metres, units: .km)
        case .mi:
            let feet = metres / 0.3048
            return feet < 528
                ? "\(Int(feet.rounded())) ft"
                : WatchFormat.distance(metres: metres, units: .mi)
        }
    }
}
