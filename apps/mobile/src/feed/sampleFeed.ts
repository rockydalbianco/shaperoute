import type { LatLon } from "@shaperoute/shared-types";

import posts from "./sampleFeed.json";

/**
 * An example drawing of «Feed» (TASK-156, ADR-0127): a figure of the seed
 * catalogue, with a made-up runner, title, time and score. The line is the
 * route engine's, with fewer points; `tools/sample_feed.py` writes the file.
 */
export type SamplePost = {
  /** The route in the catalogue, as the API names it: "trento-star-5000-0". */
  id: string;
  user: string;
  title: string;
  /** As in the catalogue: "firenze". `cityName` makes it readable. */
  city: string;
  shape: string;
  route_m: number;
  minutes: number;
  /** From 0 to 100, as the score of a run (ADR-0090). */
  score: number;
  line: LatLon[];
};

/** The example drawings, in the order they are shown. In the file a point is
 * a list of two numbers, which is what a `LatLon` is. */
export const SAMPLE_FEED = posts as unknown as readonly SamplePost[];
