import { t, tLater } from "../i18n";
import { NoteRow } from "../route/NoteRow";

/** The line under every swim (TASK-323 C), the text the user approved
 * (ADR-0283): where the route stays, and the one rule the notice puts first. */
export const SWIM_ROUTE_NOTE = tLater("Within 150 m of the shore. Never swim alone.");

/**
 * Under every swim route, always, the notice read or not: a note with the
 * sign of the engine's warnings to watch for, the same row (NoteRow,
 * TASK-444).
 */
export function SwimRouteNote() {
  return <NoteRow note={{ tone: "caution", text: t(SWIM_ROUTE_NOTE) }} />;
}
