import {
  type Activity,
  type EditReason,
  type ImageReason,
  IMAGE_REASONS,
  MAX_IMAGE_BYTES,
} from "@shaperoute/shared-types";

import { t } from "../i18n";
import { nearestTenths, tenthsToM, unitsNumber } from "../units/distanceInput";
import { METRES_PER_MILE } from "../units/format";
import { appUnits, type Units } from "../units/units";
import {
  APP_DISTANCE_LIMITS_KM,
  APP_DISTANCE_LIMITS_MI,
  offeredDistanceM,
} from "./distance";
import { shapeList } from "./shapeWords";
import type { EditProblem, ImageProblem } from "./useImageOutline";
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

/**
 * The distance the API says the shape fits at, as the app offers it: only
 * within the distances «Draw» offers for `activity`. In km as it is. With
 * «Miles» (TASK-182) the nearest whole mile within the limits; when that is
 * the distance just `asked`, the nearest tenth of a mile ("3.1 mi" after 3
 * mi), and none when that is it too: a «Try» never asks again for what
 * just failed. On the water the API's distance is the most that fits
 * (ADR-0164): `atMost` rounds down to the whole mile, never up.
 */
export function fitsAtM(
  fits: number | null | undefined,
  activity: Activity,
  units: Units = appUnits(),
  asked: number | null = null,
  atMost = false,
): number | null {
  const [lowest, highest] = APP_DISTANCE_LIMITS_KM[activity];
  if (fits == null || fits < lowest * 1000 || fits > highest * 1000) {
    return null;
  }
  if (units === "km") {
    return fits;
  }
  const [least, most] = APP_DISTANCE_LIMITS_MI[activity];
  if (atMost) {
    const miles = Math.min(most, Math.floor(fits / METRES_PER_MILE));
    const metres = tenthsToM(miles * 10, "mi");
    return miles < least || metres === asked ? null : metres;
  }
  const whole = offeredDistanceM(fits, activity, "mi");
  if (whole !== asked) {
    return whole;
  }
  const tenths = nearestTenths(fits, "mi");
  const metres = tenthsToM(tenths, "mi");
  return tenths < least * 10 || tenths > most * 10 || metres === asked ? null : metres;
}

/** "This shape does not fit…" with the distance it fits at, for what the
 * route draws: in km as the app always said it, in miles with «Miles». */
function fitsAtText(kind: ChoiceKind, fits: number, units: Units): string {
  if (units === "km") {
    return `This ${kind} does not fit the roads here at this distance. It fits at about ${fits / 1000} km.`;
  }
  const miles = { mi: unitsNumber(fits, "mi") };
  switch (kind) {
    case "word":
      return t(
        "This word does not fit the roads here at this distance. It fits at about {mi} mi.",
        miles,
      );
    case "image":
      return t(
        "This image does not fit the roads here at this distance. It fits at about {mi} mi.",
        miles,
      );
    default:
      return t(
        "This shape does not fit the roads here at this distance. It fits at about {mi} mi.",
        miles,
      );
  }
}

/** `kind`: what the route draws; a word that does not fit is not offered
 * the shapes, but a shorter word (TASK-057). `activity`: the request's, whose
 * distances «Draw» offers (TASK-190); a run's unless said. `asked`: the
 * distance of the request, in metres, when there is one: with «Miles» a
 * distance offered is never the one that just failed (TASK-182). */
export function problemText(
  problem: RouteProblem,
  kind: ChoiceKind = "shape",
  activity: Activity = "running",
  asked: number | null = null,
  units: Units = appUnits(),
): ProblemText {
  switch (problem.kind) {
    case "api_error":
      switch (problem.code) {
        case "shape_not_drawable": {
          if (activity === "paddling") {
            return waterProblemText(
              problem.message,
              fitsAtM(problem.suggested_distance_m, activity, units, asked, true),
              units,
            );
          }
          // Offered only within the distances «Draw» offers for it.
          const fits = fitsAtM(problem.suggested_distance_m, activity, units, asked);
          if (fits !== null) {
            return {
              text: fitsAtText(kind, fits, units),
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
            text: isImageReason(problem.reason)
              ? REASON_TEXT[problem.reason]
              : "The route engine cannot find one clear outline in this picture.",
            detail: problem.message,
          };
        case "outline_edit_rejected":
          return {
            text:
              problem.reason && problem.reason in EDIT_REASON_TEXT
                ? EDIT_REASON_TEXT[problem.reason as EditReason]
                : "This line cannot be added to the outline. Draw it again.",
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

/** The engine's words for a start with no water near it
 * (route_engine/water_fit.py, NoWaterError): the API passes them on. */
const NO_WATER = "no lake or sea";

/**
 * A shape not drawn on the water (TASK-191, ADR-0169), said for the water
 * and not the roads: no lake or sea near the start, or a shape that does not
 * fit within 1 km of the shore. There only shapes of the catalogue are
 * drawn. The distance the API offers is rounded down to the half km
 * (ADR-0164), "It fits at about 2.5 km"; `fits` is that distance as the app
 * offers it (fitsAtM), or null.
 */
function waterProblemText(
  message: string,
  fits: number | null,
  units: Units,
): ProblemText {
  if (message.includes(NO_WATER)) {
    return {
      // The engine looks within 2 km: a mile from the water is within them.
      text:
        units === "mi"
          ? t(
              "There is no lake or sea near this start. Start from the shore, within 1 mile of the water.",
            )
          : t(
              "There is no lake or sea near this start. Start from the shore, within 2 km of the water.",
            ),
      detail: message,
    };
  }
  if (fits !== null) {
    return {
      text:
        units === "mi"
          ? t(
              "This shape does not fit on the water here at this distance. It fits at about {mi} mi.",
              { mi: unitsNumber(fits, "mi") },
            )
          : t(
              "This shape does not fit on the water here at this distance. It fits at about {km} km.",
              { km: fits / 1000 },
            ),
      detail: message,
      tryDistanceM: fits,
    };
  }
  return {
    text: t(
      "This shape does not fit on the water here. Try a shorter distance, another shape, or another start:",
    ),
    detail: message,
    pickShape: true,
  };
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
    "The picture shows more than 4 separate things. Use a picture with 4 subjects at most.",
  edge: "The subject touches the edge of the picture. Leave some background all around it.",
  small: "The subject is too small. Get closer, or use a bigger picture.",
  jagged: "The outline is too jagged to run on roads. Try a simpler subject.",
};

function isImageReason(reason: unknown): reason is ImageReason {
  return (IMAGE_REASONS as readonly unknown[]).includes(reason);
}

/**
 * Why a line drawn on the outline was refused, in plain words and with what
 * to do (the reasons of route_engine/outline_edits.py, TASK-079).
 */
export const EDIT_REASON_TEXT: Record<EditReason, string> = {
  short: "This line is too short to add. Draw a longer one.",
  covers_detail:
    "This part covers where a detail starts. Undo the detail first, or draw the part elsewhere.",
  too_many_corners:
    "That is too much for one route. Undo something, or draw simpler lines.",
};

/** Under the picture: why a drawn line was not added (TASK-079). */
export function editProblemText(problem: EditProblem): ProblemText {
  return problemText(problem, "image");
}

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
