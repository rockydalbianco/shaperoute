import { type ImageReason, MAX_IMAGE_BYTES } from "@shaperoute/shared-types";

import { MAX_APP_DISTANCE_KM } from "./distance";
import { shapeList } from "./shapeWords";
import type { ImageProblem } from "./useImageOutline";
import type { RouteProblem } from "./useRouteRequest";
import type { DrawKind } from "./wordInput";

/** What the route draws: a shape, a word, or the outline of an image. */
export type ChoiceKind = DrawKind | "image";

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

/** `kind`: what the route draws; a word that does not fit is not offered
 * the shapes, but a shorter word (TASK-057). */
export function problemText(
  problem: RouteProblem,
  kind: ChoiceKind = "shape",
): ProblemText {
  switch (problem.kind) {
    case "api_error":
      switch (problem.code) {
        case "shape_not_drawable": {
          const fits = problem.suggested_distance_m;
          if (fits != null && fits <= MAX_APP_DISTANCE_KM * 1000) {
            return {
              text: `This ${kind} does not fit the roads here at this distance. It fits at about ${fits / 1000} km.`,
              detail: problem.message,
              tryDistanceM: fits,
            };
          }
          if (kind === "word") {
            return {
              text: "This word does not fit the roads here. Try a shorter word, or another start.",
              detail: problem.message,
            };
          }
          if (kind === "image") {
            return {
              text: "This outline does not fit the roads here. Try another distance, another start, or a simpler picture.",
              detail: problem.message,
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
        case "image_not_usable":
          return {
            text: problem.reason
              ? REASON_TEXT[problem.reason]
              : "The route engine cannot find one clear outline in this picture.",
            detail: problem.message,
          };
        case "ai_unavailable":
          return {
            text: `The AI that reads shape words is not running on the PC (Ollama). These words work without it: ${shapeList()}.`,
            detail: problem.message,
          };
        // The key and the limit of an API reached from outside (TASK-081).
        case "unauthorized":
          return {
            text: "The API refused this app's key. Put the API's key in EXPO_PUBLIC_API_KEY in apps/mobile/.env, then restart npm run mobile (docs/DEPLOY.md).",
            detail: problem.message,
          };
        case "too_many_requests":
          return {
            text: "Too many requests to the API in the last minute. Wait a minute, then try again.",
            detail: problem.message,
          };
        default:
          return { text: `${BUG}: ${problem.code}.`, detail: problem.message };
      }
    case "bad_answer":
      return { text: `${BUG}: unexpected answer, HTTP ${problem.status}.` };
    case "unreachable":
      return {
        text: `Cannot reach the API at ${problem.url}. Check that it is running (on the PC: with --lan) and that the phone can reach it: same Wi-Fi, Tailscale on, or the server address in apps/mobile/.env (docs/DEPLOY.md).`,
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

/**
 * Why the engine found no outline, in plain words and with what to do
 * (the reasons of route_engine/image_outline.py, ADR-0068).
 */
export const REASON_TEXT: Record<ImageReason, string> = {
  format: "Only PNG and JPEG pictures work. Choose another one.",
  unreadable: "This picture could not be read. Choose another one.",
  background:
    "The background is too busy. Use one subject on a plain background, like a drawing on white paper or an object on a bare table.",
  no_subject:
    "Nothing stands out from the background. Use a subject much darker or brighter than what is around it.",
  scattered:
    "The picture shows more than one thing. Use a picture with a single subject.",
  edge: "The subject touches the edge of the picture. Leave some background all around it.",
  small: "The subject is too small. Get closer, or use a bigger picture.",
  jagged: "The outline is too jagged to run on roads. Try a simpler subject.",
};

/** Under the picture: why there is no outline to draw. */
export function imageProblemText(problem: ImageProblem): ProblemText {
  switch (problem.kind) {
    case "denied":
      return {
        text: "The camera is off for this app. Allow it in Settings, or choose a picture instead.",
      };
    case "too_large":
      return {
        text: `This picture is too large: ${(problem.bytes / 1e6).toFixed(1)} MB, at most ${MAX_IMAGE_BYTES / 1e6} MB. Choose a smaller one.`,
      };
    case "pick_failed":
      return {
        text: "The picture could not be opened. Try again, or choose another one.",
      };
    default:
      return problemText(problem, "image");
  }
}
