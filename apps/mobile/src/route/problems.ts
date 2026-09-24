import { MAX_APP_DISTANCE_KM } from "./distance";
import { shapeList } from "./shapeWords";
import type { RouteProblem } from "./useRouteRequest";

/**
 * What the screen says: what happened and what to do, then details. The
 * way out, when there is one to tap (TASK-031): a distance the shape fits,
 * or the shapes of the catalogue.
 */
export type ProblemText = {
  text: string;
  detail?: string;
  tryDistanceM?: number;
  pickShape?: boolean;
};

const BUG = "The app and the API do not agree (a bug)";

export function problemText(problem: RouteProblem): ProblemText {
  switch (problem.kind) {
    case "api_error":
      switch (problem.code) {
        case "shape_not_drawable": {
          const fits = problem.suggested_distance_m;
          if (fits != null && fits <= MAX_APP_DISTANCE_KM * 1000) {
            return {
              text: `This shape does not fit the roads here at this distance. It fits at about ${fits / 1000} km.`,
              detail: problem.message,
              tryDistanceM: fits,
            };
          }
          return {
            text: "This shape does not fit the roads here. Try another shape, or another start:",
            detail: problem.message,
            pickShape: true,
          };
        }
        case "map_data_unavailable":
          return {
            text: "Map data for this area could not be downloaded. Try again later.",
            detail: problem.message,
          };
        case "engine_error":
          return {
            text: "The route engine failed. Try again; if it happens again, look at the API log.",
          };
        case "ai_unavailable":
          return {
            text: `The AI that reads shape words is not running on the PC (Ollama). These words work without it: ${shapeList()}.`,
            detail: problem.message,
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
        text: "The API took more than 5 minutes. Try again later, or a shorter distance.",
      };
    case "lost":
      return {
        text: "The API lost this request (was it restarted?). Try again.",
      };
    case "no_sharing":
      return { text: "This phone cannot open the share sheet." };
    case "share_failed":
      return { text: "The GPX could not be saved on the phone. Try again." };
    case "no_api_url":
      return {
        text: "The app does not know where the API is: open it from the QR code of npm run mobile on the PC.",
      };
  }
}
