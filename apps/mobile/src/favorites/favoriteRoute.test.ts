import favorite from "@shaperoute/shared-types/fixtures/favorite.json";
import favorites from "@shaperoute/shared-types/fixtures/favorites.json";
import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import wordResult from "@shaperoute/shared-types/fixtures/route-result-word.json";
import imageResult from "@shaperoute/shared-types/fixtures/route-result-image.json";
import {
  type LatLon,
  MAX_OUTLINE_POINTS,
  type RouteResult,
} from "@shaperoute/shared-types";

import type { Favorite, FavoriteDetail } from "../api/favorites";
import type {
  RecommendedRoute,
  RecommendedRouteDetail,
} from "../explore/recommendedRoutes";
import type { ThemedResult } from "../explore/themedRoutes";
import { favoriteKey } from "./favoriteKey";
import {
  drawnKeepable,
  exploredKeepable,
  favoriteHeading,
  favoritePlace,
  favoriteTitle,
  keptNow,
  openedFavorite,
  outlineOf,
  themedKeepable,
} from "./favoriteRoute";

const START: LatLon = [46.067, 11.1215];
const [KEPT_STAR, KEPT_WORD] = favorites.favorites as Favorite[];

test("a shape drawn is kept with its shape, its two distances and its line", () => {
  const drawn = result as unknown as RouteResult;
  const kept = drawnKeepable(
    { start: START, shape: "heart", distance_m: 5000, activity: "running" },
    drawn,
    null,
  );
  expect(kept.id).toBe(favoriteKey(drawn.points));
  expect(kept.request).toEqual({
    city: "",
    shape: drawn.shape,
    word: null,
    style: null,
    title: null,
    distance_m: 5000,
    route_m: Math.round(drawn.distance_m),
    similarity: drawn.similarity,
    points: drawn.points,
  });
});

test("a word drawn is kept with its style, and the place searched for", () => {
  const drawn = wordResult as unknown as RouteResult;
  const kept = drawnKeepable(
    {
      start: START,
      word: "CIAO",
      style: "block",
      distance_m: 12000,
      activity: "running",
    },
    drawn,
    "  Piazza Duomo, Trento ",
  );
  expect(kept.request).toMatchObject({
    city: "Piazza Duomo, Trento",
    shape: null,
    word: drawn.word,
    style: "block",
    title: null,
  });
});

test("an image drawn has neither: it is called «Image»", () => {
  const drawn = imageResult as unknown as RouteResult;
  const kept = drawnKeepable(
    {
      start: START,
      outline: [
        [0, 1],
        [1, -1],
        [-1, -1],
        [0, 1],
      ],
      distance_m: 15000,
      activity: "running",
    },
    drawn,
    null,
  );
  expect(kept.request).toMatchObject({
    shape: null,
    word: null,
    style: null,
    title: "Image",
  });
  expect(favoriteTitle(kept.request)).toBe("Image");
});

test("a route of «Explore» is kept as its card has it", () => {
  const route = list.routes[0] as RecommendedRoute;
  const kept = exploredKeepable(route, detail as RecommendedRouteDetail);
  expect(kept.id).toBe(favoriteKey(detail.points as LatLon[]));
  expect(kept.request).toMatchObject({
    city: "trento",
    shape: "star",
    word: null,
    style: null,
    title: null,
    distance_m: detail.distance_m,
    route_m: detail.route_m,
  });
});

test("a themed route is kept under its theme; what the API would refuse is cut", () => {
  const themed: ThemedResult = {
    points: detail.points as LatLon[],
    distance_m: 5120.4,
    similarity: 1.0000001,
    shape: "star",
    theme: "fountain",
    theme_label: "Fountains ".repeat(8),
    target_m: 5000,
    city: null,
    centre: START,
    stops: [],
    license: "",
  };
  const kept = themedKeepable(themed);
  expect(kept.request.title).toHaveLength(60);
  expect(kept.request.city).toBe("");
  expect(kept.request.similarity).toBe(1);
  expect(kept.request.route_m).toBe(5120);
  expect(favoriteTitle({ ...kept.request, title: "Fountains" })).toBe("Fountains");
});

test("a card reads «Star · 5.1 km», and the city when there is one", () => {
  expect(favoriteHeading(KEPT_STAR)).toBe("Star · 5.1 km");
  expect(favoritePlace(KEPT_STAR)).toBe("Trento");
  expect(favoriteHeading(KEPT_WORD)).toBe("CIAO · 12.5 km");
  expect(favoritePlace(KEPT_WORD)).toBeNull();
  expect(favoriteTitle({ shape: "christmas_tree", word: null, title: null })).toBe(
    "Christmas tree",
  );
  expect(favoriteTitle({ shape: null, word: null, title: null })).toBe("Route");
});

test("kept now, the list shows it before the API answers", () => {
  const points = Array.from({ length: 500 }, (_, i): LatLon => [46 + i * 1e-4, 11]);
  const kept = keptNow(
    {
      id: "0123456789abcdef",
      request: {
        city: "trento",
        shape: "star",
        word: null,
        style: null,
        title: null,
        distance_m: 5000,
        route_m: 5120,
        similarity: 0.996,
        points,
      },
    },
    new Date("2026-10-02T09:00:00Z"),
  );
  expect(kept).toMatchObject({ city: "trento", shape: "star", route_m: 5120 });
  expect(kept.id).toBe("0123456789abcdef");
  expect(kept.start).toEqual(points[0]);
  expect(kept.preview).toHaveLength(64);
  expect(kept.preview[63]).toEqual(points[499]);
  expect(kept.created_at).toBe("2026-10-02T09:00:00.000Z");
  expect(kept).not.toHaveProperty("points");
});

test("the outline of a line is closed, inside [-1, 1], north up, and short", () => {
  // Twice as wide as tall, around Trento.
  const k = Math.cos((46.005 * Math.PI) / 180);
  const box: LatLon[] = [
    [46, 11],
    [46, 11 + 0.02 / k],
    [46.01, 11 + 0.02 / k],
    [46.01, 11],
    [46, 11],
  ];
  const outline = outlineOf(box);
  expect(outline).toHaveLength(5);
  const expected = [
    [-1, -0.5],
    [1, -0.5],
    [1, 0.5],
    [-1, 0.5],
    [-1, -0.5],
  ];
  outline.forEach(([x, y], i) => {
    expect(x).toBeCloseTo(expected[i][0], 3);
    expect(y).toBeCloseTo(expected[i][1], 3);
  });

  const long = Array.from({ length: 3000 }, (_, i): LatLon => {
    const turn = (i / 3000) * 2 * Math.PI;
    return [46 + 0.01 * Math.sin(turn), 11 + 0.01 * Math.cos(turn)];
  });
  const short = outlineOf(long);
  // Not closed as it was cut: the first point closes it.
  expect(short).toHaveLength(MAX_OUTLINE_POINTS + 1);
  expect(short[short.length - 1]).toEqual(short[0]);
  expect(short.flat().every((n) => n >= -1 && n <= 1)).toBe(true);
});

test("a favorite opens as a route of «Explore», with itself to keep again", () => {
  const opened = openedFavorite(favorite as FavoriteDetail);
  expect(opened.status).toBe("done");
  expect(opened.route).toMatchObject({
    id: favorite.id,
    city: "trento",
    shape: "star",
  });
  expect(opened.detail.points).toBe(favorite.points);
  expect(opened.result).toMatchObject({
    points: favorite.points,
    distance_m: favorite.route_m,
    similarity: favorite.similarity,
    shape: "star",
    directions: [],
  });
  expect(opened.request).toEqual({
    start: favorite.points[0],
    distance_m: favorite.distance_m,
    activity: "running",
    shape: "star",
  });
  expect(opened.choices).toEqual([opened.result]);
  expect(opened.others).toEqual([]);
  expect(opened.keepable.id).toBe(favorite.id);
  expect(opened.keepable.request.points).toBe(favorite.points);
});

test("a favorite with no city and no shape still has a card and a GPX", () => {
  const image: FavoriteDetail = {
    ...(favorite as FavoriteDetail),
    city: "",
    shape: null,
    title: "Image",
  };
  const opened = openedFavorite(image);
  // The card reads "image · Favorite · looks 100% like it".
  expect(opened.route.shape).toBe("image");
  expect(opened.route.city).toBe("favorite");
  // The export sends the line as the outline the phone no longer has.
  expect(opened.request).toMatchObject({
    start: favorite.points[0],
    distance_m: favorite.distance_m,
    outline: outlineOf(favorite.points as LatLon[]),
  });
  expect(opened.result.shape).toBeNull();
  // Kept again, it is what it was: no city, its title.
  expect(opened.keepable.request).toMatchObject({
    city: "",
    shape: null,
    title: "Image",
  });
});
