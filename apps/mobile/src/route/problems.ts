import type { RouteProblem } from "./useRouteRequest";

/** What the screen says: what happened and what to do, then details. */
export type ProblemText = { text: string; detail?: string };

const BUG = "The app and the API do not agree (a bug)";

export function problemText(problem: RouteProblem): ProblemText {
  switch (problem.kind) {
    case "api_error":
      switch (problem.code) {
        case "shape_not_drawable":
          return {
            text: "This shape does not fit the roads here. Try another distance, shape or start.",
            detail: problem.message,
          };
        case "map_data_unavailable":
          return {
            text: "Map data for this area could not be downloaded. Try again later.",
            detail: problem.message,
          };
        case "engine_error":
          return {
            text: "The route engine failed. Try again; if it happens again, look at the API log.",
          };
        default:
          return { text: `${BUG}: ${problem.code}.`, detail: problem.message };
      }
    case "bad_answer":
      return { text: `${BUG}: unexpected answer, HTTP ${problem.status}.` };
    case "unreachable":
      return {
        text: `Cannot reach the API at ${problem.url}. Start it on the PC with --lan, on the same Wi-Fi.`,
      };
    case "timeout":
      return {
        text: "No answer within a minute. The API may be downloading map data for a new area: try again shortly.",
      };
    case "no_api_url":
      return {
        text: "The app does not know where the API is: open it from the QR code of npm run mobile on the PC.",
      };
  }
}
