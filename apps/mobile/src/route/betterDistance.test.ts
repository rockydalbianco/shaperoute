import type {
  ImageRouteRequest,
  RouteRequest,
  RouteResult,
} from "@shaperoute/shared-types";
import better from "@shaperoute/shared-types/fixtures/route-result-better-distance.json";

import { saveLanguageChoice } from "../i18n/language";
import { betterDistanceM, betterDistanceText, tryText } from "./betterDistance";

afterEach(() => saveLanguageChoice("phone"));

const request: RouteRequest = {
  start: [46.0671, 11.1214],
  shape: "heart",
  distance_m: 15000,
  activity: "running",
};

function result(advised: number | null | undefined): RouteResult {
  const route: RouteResult = {
    points: [
      [46.0671, 11.1214],
      [46.0671, 11.1214],
    ],
    distance_m: 15200,
    similarity: 0.84,
    shape: "heart",
    warnings: [],
    directions: [],
  };
  return advised === undefined ? route : { ...route, better_distance_m: advised };
}

test("the API's distance is offered under the route", () => {
  expect(betterDistanceM(result(12000), request)).toBe(12000);
  // The contract's example, as the API sends it.
  const answer = better as unknown as RouteResult;
  expect(betterDistanceM(answer, request)).toBe(12000);
});

test("nothing without it, nor from an older API", () => {
  expect(betterDistanceM(result(null), request)).toBeNull();
  expect(betterDistanceM(result(undefined), request)).toBeNull();
});

test("only within the distances «Draw» offers for the activity", () => {
  // A run goes up to 21 km in the app, though the API takes 50.
  expect(betterDistanceM(result(25000), request)).toBeNull();
  expect(betterDistanceM(result(21000), request)).toBe(21000);
  const ride: RouteRequest = { ...request, activity: "cycling", distance_m: 20000 };
  expect(betterDistanceM(result(8000), ride)).toBeNull();
  expect(betterDistanceM(result(15000), ride)).toBe(15000);
});

test("never on the water, nor at the distance asked for", () => {
  const paddle: RouteRequest = { ...request, activity: "paddling", distance_m: 2000 };
  expect(betterDistanceM(result(3000), paddle)).toBeNull();
  expect(betterDistanceM(result(15000), request)).toBeNull();
});

test("no line back to the distance a «Try» has just left", () => {
  const tried = { ...request, distance_m: 12000 };
  const left = { from: request, to: 12000 };
  expect(betterDistanceM(result(15000), tried, left)).toBeNull();
  // Another distance is still offered, and so is the way back for another
  // drawing, start or distance.
  expect(betterDistanceM(result(10000), tried, left)).toBe(10000);
  const star: RouteRequest = { ...tried, shape: "star" };
  expect(betterDistanceM(result(15000), star, left)).toBe(15000);
  const elsewhere: RouteRequest = { ...tried, start: [46.0122, 11.2986] };
  expect(betterDistanceM(result(15000), elsewhere, left)).toBe(15000);
  const typed = { ...request, distance_m: 13000 };
  expect(betterDistanceM(result(15000), typed, left)).toBe(15000);
});

test("the line says what is drawn, and the button the km", () => {
  expect(betterDistanceText("shape", 12000)).toBe(
    "This shape comes out better at about 12 km.",
  );
  expect(betterDistanceText("word", 9000)).toBe(
    "This word comes out better at about 9 km.",
  );
  expect(betterDistanceText("image", 17000)).toBe(
    "This outline comes out better at about 17 km.",
  );
  expect(tryText(12000)).toBe("Try 12 km");
});

test("in the app's language", () => {
  saveLanguageChoice("it");
  expect(betterDistanceText("shape", 12000)).toBe(
    "Questa forma viene meglio a circa 12 km.",
  );
  expect(tryText(12000)).toBe("Prova 12 km");
});

test("an image route is offered its distance like a shape", () => {
  const image: ImageRouteRequest = {
    start: request.start,
    distance_m: 10000,
    activity: "running",
    outline: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
  };
  expect(betterDistanceM(result(12000), image)).toBe(12000);
});
