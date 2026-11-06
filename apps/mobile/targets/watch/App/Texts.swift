import Foundation

/// `text` in the watch's language, by its English one as in the app
/// (ADR-0172): <language>.lproj/Localizable.strings, written from the app's
/// tables by scripts/watch-texts.sh. A text with no translation stays
/// English.
func tr(_ text: String) -> String {
    Bundle.main.localizedString(forKey: text, value: text, table: nil)
}
