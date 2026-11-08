import Foundation
import WatchConnectivity
import WatchCore

/// The phone, through WatchConnectivity (TASK-370 part A2): WatchCore's
/// messages both ways. A command the phone sends while the app is open
/// arrives as a message; where the workout is goes as a message when the
/// phone is reachable, and otherwise as the application context, which the
/// phone reads when it next opens. The phone's side is part A3: it sends
/// every message waiting for a reply (react-native-watch-connectivity
/// 2.0.0), so those are answered with an empty one, and its units come as
/// user info.
final class PhoneLink: NSObject, WCSessionDelegate {
    /// What the phone asked, already read: a message that does not read is
    /// left out, as WatchCore's rules say.
    var onMessage: (@MainActor (WatchMessage) -> Void)?

    override init() {
        super.init()
        guard WCSession.isSupported() else {
            return
        }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func send(_ message: WatchMessage) {
        guard WCSession.isSupported() else {
            return
        }
        let session = WCSession.default
        guard session.activationState == .activated else {
            return
        }
        let fields = message.encoded()
        let isState: Bool
        if case .state = message {
            isState = true
        } else {
            isState = false
        }
        if session.isReachable {
            session.sendMessage(fields, replyHandler: nil) { _ in
                if isState {
                    try? session.updateApplicationContext(fields)
                }
            }
        } else if isState {
            try? session.updateApplicationContext(fields)
        }
    }

    func session(
        _ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        receive(message)
    }

    /// A message that waits for a reply, as the phone sends them: without
    /// this the phone's send fails.
    func session(
        _ session: WCSession, didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        receive(message)
        replyHandler([:])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        receive(userInfo)
    }

    private func receive(_ fields: [String: Any]) {
        guard let message = try? WatchMessage.decode(fields) else {
            return
        }
        Task { @MainActor [weak self] in
            self?.onMessage?(message)
        }
    }
}
