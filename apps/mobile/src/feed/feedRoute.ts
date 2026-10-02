import type { FetchWhole } from "../explore/explored";
import {
  fetchRecommended,
  fetchRecommendedRoute,
  type RecommendedRoute,
} from "../explore/recommendedRoutes";
import type { SamplePost } from "./sampleFeed";

/**
 * A drawing of «Feed» as a route of «Explore» (TASK-188): what the map and
 * its card show while the route is fetched whole. Then the route's own
 * length and likeness take the place of these.
 */
export function postRoute(post: SamplePost): RecommendedRoute {
  return {
    id: post.id,
    city: post.city,
    shape: post.shape,
    word: null,
    style: null,
    // The post does not say the distance asked for: the one run is near it.
    distance_m: post.route_m,
    route_m: post.route_m,
    // The made-up score of the run, until the route says how well it draws.
    similarity: post.score / 100,
    start: post.line[0],
    away_m: 0,
    preview: post.line,
  };
}

/** The route the post was made from: the same figure, city and length. */
export function isRouteOf(
  post: SamplePost,
  route: { city: string; shape: string | null; route_m: number },
): boolean {
  return (
    route.city === post.city &&
    route.shape === post.shape &&
    Math.round(route.route_m) === post.route_m
  );
}

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * How the route of a post is fetched whole. The id of the post says where
 * the route stood in its city's file when the feed was written
 * (tools/sample_feed.py), and the catalogue has grown since: when the id is
 * another route's by now, or nobody's, the route is looked for among those
 * that start where the drawing starts. A route no longer in the catalogue
 * fails, as one that does not load.
 */
export function fetchPostRoute(post: SamplePost, options: Options = {}): FetchWhole {
  return async (apiUrl) => {
    const byId = await fetchRecommendedRoute(apiUrl, post.id, options);
    if (byId.kind === "route" && isRouteOf(post, byId.route)) {
      return byId;
    }
    const near = await fetchRecommended(apiUrl, post.line[0], options);
    const found =
      near.kind === "routes"
        ? near.routes.find((route) => isRouteOf(post, route))
        : undefined;
    if (found === undefined) {
      return { kind: "failed" };
    }
    const whole = await fetchRecommendedRoute(apiUrl, found.id, options);
    return whole.kind === "route" && isRouteOf(post, whole.route)
      ? whole
      : { kind: "failed" };
  };
}
