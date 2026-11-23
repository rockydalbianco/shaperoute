import Foundation

/// The pen of a word or a shape in pieces, along the run (TASK-370 part
/// B2): the phone's src/navigation/penUp.ts. The pen goes up when the
/// runner reaches the first point of a walk, the end of a letter or part,
/// and comes down `downM` before its last point, the start of the next.
/// Both are read from the navigator's metres along the route, never from a
/// fix alone.
public struct Pen: Equatable, Sendable {
    /// The next letter starts the recording this far before it: half of
    /// `Navigator.poorFixM`.
    public static let downM = Navigator.poorFixM / 2
    /// On the water the next part starts this far before it.
    public static let downOnWaterM = 5.0

    /// A walk in metres along the route, and the letter it leads to.
    public struct Stretch: Equatable, Sendable {
        public var fromM: Double
        public var toM: Double
        public var letter: String?
    }

    /// What the pen did at a fix.
    public enum Move: Equatable, Sendable {
        case up
        case down
    }

    public var walks: [Stretch]
    /// The walk ahead or being walked; walks.count after the last.
    public var next = 0
    /// The pen is up: the runner is on walks[next].
    public var up = false
    /// Between the letters by bike: "Ride to the U".
    public var ride: Bool
    /// The pieces of a shape, not letters: "the next part".
    public var parts: Bool
    /// Between the pieces on the water: "Paddle to the next part".
    public var paddle: Bool
    /// How far before the end of a walk the pen comes down.
    public var downM: Double

    /// The pen at the start of a route whose metres from its start are
    /// `along`, with its walks as pairs of point indices. `word` names the
    /// letters: the walk at `i` leads to its letter `i + 1` when it has one
    /// more letter than walks. Whether the sport rides (the phone's `isRide`:
    /// the bike, gravel, MTB, Roller) or paddles is the phone's to say: it
    /// sends it with the route.
    public static func start(
        along: [Double], walks: [(Int, Int)], word: String?, ride: Bool, paddle: Bool
    ) -> Pen {
        let letters = (word ?? "").uppercased().map(String.init)
        let named = letters.count == walks.count + 1
        let point = { (i: Int) in along.indices.contains(i) ? along[i] : 0 }
        return Pen(
            walks: walks.enumerated().map { i, walk in
                Stretch(fromM: point(walk.0), toM: point(walk.1), letter: named ? letters[i + 1] : nil)
            },
            ride: ride,
            parts: (word ?? "").isEmpty,
            paddle: paddle,
            downM: paddle ? downOnWaterM : downM
        )
    }

    /// The pen after a fix the navigator placed `alongM` along the route,
    /// and the cue for it. A fix less accurate than `Navigator.poorFixM`
    /// moves nothing. One move at most per fix.
    public static func move(
        _ pen: Pen, alongM: Double, accuracyM: Double? = nil
    ) -> (Pen, Move?, [GuideCue]) {
        guard pen.next < pen.walks.count else {
            return (pen, nil, [])
        }
        if let accuracyM, accuracyM > Navigator.poorFixM {
            return (pen, nil, [])
        }
        let walk = pen.walks[pen.next]
        var moved = pen
        if !pen.up {
            if alongM < walk.fromM {
                return (pen, nil, [])
            }
            moved.up = true
            return (moved, .up, [.penUp(letter: walk.letter)])
        }
        if alongM < walk.toM - pen.downM {
            return (pen, nil, [])
        }
        moved.next += 1
        moved.up = false
        return (moved, .down, [.penDown(letter: walk.letter)])
    }
}
