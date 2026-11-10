import Foundation

/// The vibration of a cue on the wrist (TASK-370 part B3b, the user's choice
/// «Come Apple Maps»): the app plays watchOS's own for each.
public enum GuideHaptic: Equatable, Sendable {
    /// A turn to the right ahead: `.navigationRightTurn`.
    case right
    /// A turn to the left ahead: `.navigationLeftTurn`.
    case left
    /// Any other manoeuvre ahead, a U-turn, straight on onto another road:
    /// `.navigationGenericManeuver`.
    case maneuver
    /// Off the route: `.failure`.
    case offRoute
    /// Back on the route: `.success`.
    case backOnRoute
    /// The end of the route: `.success`.
    case arrived
    /// The pen up or down: `.click`.
    case pen
}

/// What the first page of a run with a route shows (TASK-370 part B3b, the
/// user's choice «Freccia prima»): a big arrow, the metres, the road.
public struct GuideScreen: Equatable, Sendable {
    public enum Mode: Equatable, Sendable {
        /// A closed route not joined yet: «Reach the route to start».
        case waiting
        /// Along the route, towards the next turn or the end.
        case following
        /// Off the route: «Off route», the arrow towards it.
        case offRoute
        /// At the end.
        case arrived
    }

    /// The pen of a route in pieces, while it is up.
    public enum PenNote: Equatable, Sendable {
        /// «To the O»: the next letter.
        case toLetter(String)
        /// «Next part»: a shape in pieces, or letters the route does not name.
        case nextPart
    }

    public var mode: Mode
    /// How far to turn an arrow that points up, in degrees clockwise: the
    /// turn ahead, or, off the route, where the route is from the way the
    /// runner goes. nil when there is nowhere to point.
    public var arrowDeg: Double?
    /// The metres to the next turn, to the end, or to the route; nil when
    /// none is known.
    public var metres: Double?
    /// The turn ahead, as the engine names it ("left", "sharp-right"): the
    /// app shows its words, the phone's banner texts.
    public var turn: String?
    /// The road the turn goes onto; nil when OSM has no name.
    public var street: String?
    public var pen: PenNote?
}

/// From the guidance's state and cues to what the wrist shows and feels
/// (TASK-370 part B3b): pure, so the watch app only draws and plays it.
public enum GuideDisplay {
    /// The vibration of a cue, as Apple Maps gives them; nil for a cue that
    /// is only shown: the road the run heads out on, where the route is.
    public static func haptic(for cue: GuideCue, directions: [GuideDirection]) -> GuideHaptic? {
        switch cue {
        case let .turn(index, _, _):
            guard directions.indices.contains(index) else {
                return .maneuver
            }
            switch directions[index].turn {
            case "right", "sharp-right":
                return .right
            case "left", "sharp-left":
                return .left
            default:
                return .maneuver
            }
        case .offRoute:
            return .offRoute
        case .backOnRoute:
            return .backOnRoute
        case .arrived:
            return .arrived
        case .penUp, .penDown:
            return .pen
        case .depart, .routeAt:
            return nil
        }
    }

    /// The vibrations of the cues of one fix, each kind once, in order: a
    /// fix that says «back on the route» and a turn plays both, a chain of
    /// cues of one kind plays it once.
    public static func haptics(for cues: [GuideCue], directions: [GuideDirection]) -> [GuideHaptic] {
        var played: [GuideHaptic] = []
        for cue in cues {
            if let haptic = haptic(for: cue, directions: directions), !played.contains(haptic) {
                played.append(haptic)
            }
        }
        return played
    }

    /// The first page after a fix. `headingDeg` is where the runner goes,
    /// degrees clockwise from north (the GPS course); without it, off the
    /// route the arrow points to the route as on a map with north up.
    public static func screen(
        _ navigation: Navigation, pen: Pen?, headingDeg: Double?
    ) -> GuideScreen {
        var screen = GuideScreen(mode: .following)
        screen.pen = penNote(pen)
        if navigation.arrived {
            screen.mode = .arrived
            screen.pen = nil
            return screen
        }
        if navigation.offRoute || navigation.waitingToJoin {
            screen.mode = navigation.waitingToJoin && !navigation.offRoute ? .waiting : .offRoute
            if let rejoin = navigation.rejoin {
                screen.arrowDeg = signed(rejoin.bearingDeg - (headingDeg ?? 0))
                screen.metres = rejoin.distanceM
            }
            return screen
        }
        if let next = Navigator.upcoming(navigation) {
            let direction = navigation.directions[next.index]
            screen.arrowDeg = arrow(direction)
            screen.metres = next.inM
            screen.turn = direction.turn
            screen.street = direction.street
        } else {
            screen.arrowDeg = 0
            screen.metres = Navigator.remainingM(navigation)
        }
        return screen
    }

    /// The arrow of a turn: its angle, a U-turn all the way round, the
    /// departure and straight on up.
    static func arrow(_ direction: GuideDirection) -> Double {
        switch direction.turn {
        case "depart", "straight":
            return 0
        case "u-turn":
            return 180
        default:
            return max(-180, min(180, direction.angleDeg))
        }
    }

    static func penNote(_ pen: Pen?) -> GuideScreen.PenNote? {
        guard let pen, pen.up, pen.walks.indices.contains(pen.next) else {
            return nil
        }
        if !pen.parts, let letter = pen.walks[pen.next].letter {
            return .toLetter(letter)
        }
        return .nextPart
    }

    /// An angle in (-180, 180].
    static func signed(_ angle: Double) -> Double {
        StartAnywhere.signed(angle)
    }
}
