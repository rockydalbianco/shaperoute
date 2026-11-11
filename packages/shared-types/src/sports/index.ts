/**
 * The sports of the contract (TASK-376, ADR-0320), in its order: those the
 * route engine plans, then those recorded without a shape, then those saved
 * without a track (TASK-385). A new sport is a file of this folder and a
 * line here; index.ts derives its tables.
 */
import { CYCLING } from "./cycling.ts";
import { GRAVEL_BIKING } from "./gravel_biking.ts";
import { GYM } from "./gym.ts";
import { HIKING } from "./hiking.ts";
import { INLINE_SKATING } from "./inline_skating.ts";
import { MOUNTAIN_BIKING } from "./mountain_biking.ts";
import { PADDLING } from "./paddling.ts";
import { RUNNING } from "./running.ts";
import { SKI_TOURING } from "./ski_touring.ts";
import { SKIING } from "./skiing.ts";
import { SNOWSHOEING } from "./snowshoeing.ts";
import { SWIMMING } from "./swimming.ts";
import { WALKING } from "./walking.ts";
import { XC_SKIING } from "./xc_skiing.ts";

export {
  activitiesOf,
  type PlannedSport,
  type RecordedSport,
  type TracklessSport,
} from "./base.ts";
export {
  CYCLING,
  GRAVEL_BIKING,
  GYM,
  HIKING,
  INLINE_SKATING,
  MOUNTAIN_BIKING,
  PADDLING,
  RUNNING,
  SKI_TOURING,
  SKIING,
  SNOWSHOEING,
  SWIMMING,
  WALKING,
  XC_SKIING,
};

export const PLANNED_SPORTS = [
  RUNNING,
  CYCLING,
  PADDLING,
  SWIMMING,
  HIKING,
  MOUNTAIN_BIKING,
  INLINE_SKATING,
  SNOWSHOEING,
  WALKING,
  GRAVEL_BIKING,
] as const;
export const RECORDED_SPORTS = [SKIING, XC_SKIING, SKI_TOURING] as const;
export const TRACKLESS_SPORTS = [GYM] as const;
