import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import { fontWeight, type Palette } from "../theme/tokens";
import type { Units } from "../units/units";
import { type FlightUnits, UNIT_LABEL } from "./flightUnits";
import {
  altitudeText,
  bearingText,
  clockText,
  distanceText,
  distanceUnit,
  durationText,
  glideText,
  heightChangeText,
  NO_VALUE,
  speedText,
  varioText,
} from "./flightUnits";
import type { Near } from "./airspaceNear";
import type { ProfileBand } from "./airspaceProfile";
import { acrossText, limitLabel } from "./airspaceText";
import { WIDGET_NAME, type WidgetId } from "./flightLayout";
import { bearingBetween } from "./airGeometry";
import { type Glide, glideOf, heightForM } from "./glide";
import type { NearLanding } from "./nearestLanding";
import { edgeM, gatesOn, startGateAt, type TaskNow } from "./taskProgress";
import { taskLengthM } from "./taskRoute";
import type { FlightScreenData } from "./useFlightScreenData";
import { AltitudeChart } from "./widgets/AltitudeChart";
import { Arrow, Dial } from "./widgets/CompassRose";
import { ThermalAssistant } from "./widgets/ThermalAssistant";

/**
 * One widget of the flight screen (TASK-479 part B1): its name small on
 * top, its number as big as its cell allows, its unit beside. Read at arm's
 * length, in the sun, with gloves: high contrast, nothing small that
 * matters. Numbers only, never advice.
 */

/** A climb from this much paints the vario in the accent. */
export const CLIMB_SHOWN_MPS = 0.2;

/** The widths of a bold tabular digit and of a unit's letter, per point
 * of their size: a little wide, so the number never runs out of its cell. */
const DIGIT_EM = 0.64;
const UNIT_EM = 0.62;
/** A unit is this much of the number's size. */
const UNIT_SCALE = 0.3;
/** The box's padding, both sides, and the gaps of a row. */
const PADDING = 20;
const GAP = 8;

/**
 * The number's size in a cell `width` × `height`: as big as the height
 * lets it, unless the number, its unit and what stands beside it (an
 * arrow, a dial, `sideSize` across) need the width.
 */
export function numberSize(
  width: number,
  height: number,
  value: string,
  unit: string | undefined,
  sideSize: number,
  under: boolean,
): number {
  const room = width - PADDING - (sideSize > 0 ? sideSize + GAP : 0) - (unit ? GAP : 0);
  const ems = value.length * DIGIT_EM + (unit ? unit.length * UNIT_EM * UNIT_SCALE : 0);
  const byWidth = room / Math.max(1, ems);
  const byHeight = height * (under ? 0.4 : 0.52);
  return Math.max(16, Math.min(byWidth, byHeight, 140));
}

type Props = {
  widget: WidgetId;
  data: FlightScreenData;
  flight: FlightUnits;
  units: Units;
  palette: Palette;
  width: number;
  height: number;
  /** The nearest volume of the pilot's airspace file (part E2): null
   * when none is near or none is loaded. */
  nearest?: Near | null;
  /** The volumes of the file under the altitude chart, bar by bar (part
   * E3); none without a file. */
  bands?: readonly ProfileBand[][];
  /** The pilot's task at this tick (part D2), null without one. */
  task?: TaskNow | null;
  /** The glide the heights are worked out with (part D3); L/D 8 and the
   * estimated wind when not given. */
  glide?: Glide;
  /** The nearest landing of the pilot's waypoint file (part D3); null
   * without one, undefined without a file. */
  landing?: NearLanding | null;
};

export const NO_TASK = tLater("No task loaded");
export const GOAL_TAKEN_LINE = tLater("Goal taken");
export const GATE_OPEN = tLater("Gate open");
export const STARTED_AT = tLater("Started {time}");
export const WHOLE_TASK = tLater("Whole task: {distance}");
export const NEEDS_HEIGHT = tLater("needs {height}");
export const NO_LANDINGS = tLater("No landings in your file");

/** The height over the next turnpoint at the end of the first leg,
 * metres, and the altitude that leg needs; null where not known. */
export function nextTurnpointGlide(
  now: TaskNow,
  altM: number | null,
  glide: Glide,
): { overM: number | null; needsM: number | null } {
  const turnpoint = now.task.turnpoints[now.progress.next];
  const first = legsOf(now).slice(0, 1);
  const need = first.length === 0 ? null : heightForM(first, glide);
  const ground = turnpoint?.waypoint.altM ?? null;
  const needsM = need === null || ground === null ? null : ground + need;
  return { overM: altM === null || needsM === null ? null : altM - needsM, needsM };
}

/** The legs of the way left, each with its course. */
export function legsOf(now: TaskNow): { distM: number; courseDeg: number }[] {
  if (now.here === null || now.left === null) {
    return [];
  }
  let from = now.here;
  return now.left.points.map((point, index) => {
    const leg = {
      distM: now.left?.legsM[index] ?? 0,
      courseDeg: bearingBetween(from, point),
    };
    from = point;
    return leg;
  });
}

/** The height over the goal at the end of the way left, metres: + above,
 * − below; null where it cannot be worked out. */
export function overGoalM(
  now: TaskNow,
  altM: number | null,
  glide: Glide,
): number | null {
  const goal = now.task.turnpoints[now.task.turnpoints.length - 1];
  const need = heightForM(legsOf(now), glide);
  return altM === null ||
    need === null ||
    goal.waypoint.altM === null ||
    now.left === null
    ? null
    : altM - need - goal.waypoint.altM;
}

function Box({
  name,
  value,
  unit,
  palette,
  width,
  height,
  background,
  ink,
  under,
  side,
  sideSize = 0,
  testID,
}: {
  name: string;
  value: string;
  unit?: string;
  palette: Palette;
  width: number;
  height: number;
  /** How wide `side` is. */
  sideSize?: number;
  background?: string;
  ink?: string;
  under?: string;
  side?: ReactNode;
  testID: string;
}) {
  const text = ink ?? palette.text;
  const big = numberSize(
    width,
    height,
    value,
    unit,
    side ? sideSize : 0,
    under !== undefined,
  );
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: background ?? palette.surface, borderColor: palette.border },
      ]}
      testID={testID}
    >
      <Text
        style={[styles.name, { color: ink ?? palette.textMuted }]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <View style={styles.row}>
        {side}
        <View style={styles.number}>
          <Text
            style={[
              styles.value,
              { color: text, fontSize: big, lineHeight: big * 1.08 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {value}
          </Text>
          {unit !== undefined ? (
            <Text
              style={[
                styles.unit,
                {
                  color: ink ?? palette.textMuted,
                  fontSize: Math.max(14, big * UNIT_SCALE),
                },
              ]}
            >
              {unit}
            </Text>
          ) : null}
        </View>
      </View>
      {under !== undefined ? (
        <Text
          style={[styles.under, { color: ink ?? palette.textMuted }]}
          numberOfLines={1}
        >
          {under}
        </Text>
      ) : null}
    </View>
  );
}

export function FlightWidget({
  widget,
  data,
  flight,
  units,
  palette,
  width,
  height,
  nearest = null,
  bands = [],
  task = null,
  glide = glideOf(data.wind),
  landing,
}: Props) {
  const name = t(WIDGET_NAME[widget]);
  const now = data.instrument;
  const id = `widget-${widget}`;
  const box = (
    value: string,
    unit?: string,
    extra: Partial<Parameters<typeof Box>[0]> = {},
  ) => (
    <Box
      name={name}
      value={value}
      unit={unit}
      palette={palette}
      width={width}
      height={height}
      testID={id}
      {...extra}
    />
  );
  switch (widget) {
    case "altitude":
      return box(altitudeText(now.altM, flight.altitude), UNIT_LABEL[flight.altitude]);
    case "aboveTakeoff":
      return box(
        heightChangeText(now.aboveTakeoffM, flight.altitude),
        UNIT_LABEL[flight.altitude],
      );
    case "aboveGround":
      return box(
        altitudeText(data.aboveGroundM, flight.altitude),
        UNIT_LABEL[flight.altitude],
      );
    case "nearestAirspace": {
      if (nearest === null) {
        return box(NO_VALUE);
      }
      const { airspace } = nearest;
      const across = acrossText(nearest, units);
      return box(across, undefined, {
        under: `${airspace.class} ${airspace.name} · ${limitLabel(
          airspace.floor,
          flight.altitude,
        )}–${limitLabel(airspace.ceiling, flight.altitude)}${nearest.approx ? " ≈" : ""}`,
        background: nearest.inside ? palette.warning : undefined,
        ink: nearest.inside ? palette.onAccent : undefined,
      });
    }
    case "nearestLanding": {
      if (landing === undefined || landing === null) {
        return box(NO_VALUE, undefined, { under: t(NO_LANDINGS) });
      }
      const arrow = Math.min(height * 0.4, width * 0.3);
      const onScreen = landing.bearingDeg - (now.trackDeg ?? 0);
      return box(
        distanceText(landing.distM, units),
        distanceUnit(landing.distM, units),
        {
          side: <Arrow size={arrow} deg={onScreen} color={palette.text} />,
          sideSize: arrow,
          under: `${landing.landing.name} · ${heightChangeText(
            landing.overM,
            flight.altitude,
          )} ${UNIT_LABEL[flight.altitude]}`,
        },
      );
    }
    case "nextTurnpoint":
    case "glideToTurnpoint":
    case "glideToGoal":
    case "startGate":
    case "taskDistance": {
      if (task === null) {
        return box(NO_VALUE, undefined, { under: t(NO_TASK) });
      }
      const { progress } = task;
      const done = progress.next >= task.task.turnpoints.length;
      if (widget === "startGate") {
        const gate = startGateAt(task.task, data.nowMs);
        if (gate === null) {
          return box(NO_VALUE);
        }
        if (progress.startMs !== null) {
          return box(t(GATE_OPEN), undefined, {
            under: t(STARTED_AT, { time: clockText(progress.startMs) }),
          });
        }
        const first = gatesOn(task.task, data.nowMs)[0];
        return gate === "open"
          ? box(t(GATE_OPEN), undefined, {
              under: first === undefined ? undefined : clockText(first),
            })
          : box(`−${durationText(gate.opensInMs)}`, undefined, {
              under: clockText(first),
            });
      }
      if (done) {
        return box(NO_VALUE, undefined, { under: t(GOAL_TAKEN_LINE) });
      }
      if (widget === "taskDistance") {
        const leftM = task.left?.totalM ?? null;
        const wholeM = taskLengthM(task.task);
        return box(distanceText(leftM, units), distanceUnit(leftM, units), {
          under: t(WHOLE_TASK, {
            distance: `${distanceText(wholeM, units)} ${distanceUnit(wholeM, units)}`,
          }),
        });
      }
      if (widget === "glideToTurnpoint") {
        const { overM } = nextTurnpointGlide(task, now.altM, glide);
        return box(
          heightChangeText(overM, flight.altitude),
          UNIT_LABEL[flight.altitude],
          {
            under: `${task.task.turnpoints[progress.next].waypoint.name} · L/D ${glide.ld}`,
          },
        );
      }
      if (widget === "glideToGoal") {
        const overM = overGoalM(task, now.altM, glide);
        const leftM = task.left?.totalM ?? null;
        return box(
          heightChangeText(overM, flight.altitude),
          UNIT_LABEL[flight.altitude],
          {
            under: `L/D ${glide.ld} · ${distanceText(leftM, units)} ${distanceUnit(leftM, units)}`,
          },
        );
      }
      // The next turnpoint: how far to its cylinder's edge, which way.
      const turnpoint = task.task.turnpoints[progress.next];
      const here = task.here;
      const edge = here === null ? null : edgeM(task.task, progress.next, here);
      const touch = task.left?.points[0] ?? null;
      const bearing =
        here === null || touch === null ? null : bearingBetween(here, touch);
      const onScreen = bearing === null ? null : bearing - (now.trackDeg ?? 0);
      const arrow = Math.min(height * 0.4, width * 0.3);
      const speed = now.speedMps;
      const needs = nextTurnpointGlide(task, now.altM, glide).needsM;
      const eta =
        edge !== null && speed !== null && speed >= 1
          ? durationText((edge / speed) * 1000)
          : null;
      return box(distanceText(edge, units), distanceUnit(edge, units), {
        side:
          onScreen === null ? null : (
            <Arrow size={arrow} deg={onScreen} color={palette.text} />
          ),
        sideSize: arrow,
        under: [
          turnpoint.waypoint.name,
          bearingText(bearing),
          eta,
          needs === null
            ? null
            : t(NEEDS_HEIGHT, {
                height: `${altitudeText(needs, flight.altitude)} ${UNIT_LABEL[flight.altitude]}`,
              }),
        ]
          .filter((one) => one !== null)
          .join(" · "),
      });
    }
    case "map":
      // The flight screen draws the map itself (FlightMap): here only its
      // name, as in the editor.
      return box(NO_VALUE, undefined);
    case "vario":
    case "varioAvg": {
      const mps = widget === "vario" ? now.varioMps : now.varioAvgMps;
      const climbing = mps !== null && mps >= CLIMB_SHOWN_MPS;
      return box(varioText(mps, flight.vario), UNIT_LABEL[flight.vario], {
        background: climbing ? palette.accent : undefined,
        ink: climbing ? palette.onAccent : undefined,
      });
    }
    case "thermalAvg":
      return box(
        varioText(data.thermal?.avgMps ?? null, flight.vario),
        UNIT_LABEL[flight.vario],
      );
    case "thermalGain":
      return box(
        heightChangeText(data.thermal?.gainM ?? null, flight.altitude),
        UNIT_LABEL[flight.altitude],
      );
    case "groundSpeed":
      return box(speedText(now.speedMps, flight.speed), UNIT_LABEL[flight.speed]);
    case "glide":
      return box(glideText(now.glideRatio));
    case "track": {
      const dial = Math.min(height * 0.5, width * 0.3);
      return box(bearingText(now.trackDeg), undefined, {
        side:
          now.trackDeg === null ? null : (
            <Dial size={dial} northDeg={-now.trackDeg} palette={palette} />
          ),
        sideSize: dial,
      });
    }
    case "wind": {
      const wind = data.wind;
      const arrow = Math.min(height * 0.4, width * 0.3);
      return box(
        wind === null ? NO_VALUE : speedText(wind.speedMps, flight.speed),
        UNIT_LABEL[flight.speed],
        {
          // The arrow goes where the wind goes, north up.
          side:
            wind === null ? null : (
              <Arrow size={arrow} deg={wind.fromDeg + 180} color={palette.text} />
            ),
          sideSize: arrow,
          under:
            wind === null
              ? undefined
              : t("From {bearing} · {minutes} min ago", {
                  bearing: bearingText(wind.fromDeg),
                  minutes: String(
                    Math.max(0, Math.round((data.nowMs - wind.atMs) / 60_000)),
                  ),
                }),
        },
      );
    }
    case "takeoff": {
      const arrow = Math.min(height * 0.4, width * 0.3);
      const bearing = now.takeoffBearingDeg;
      // The way back, as the pilot goes: up is straight on.
      const onScreen = bearing === null ? null : bearing - (now.trackDeg ?? 0);
      return box(
        distanceText(now.takeoffDistanceM, units),
        distanceUnit(now.takeoffDistanceM, units),
        {
          side:
            onScreen === null ? null : (
              <Arrow size={arrow} deg={onScreen} color={palette.text} />
            ),
          sideSize: arrow,
          under: bearing === null ? undefined : bearingText(bearing),
        },
      );
    }
    case "flightTime":
      return box(durationText(now.flightMs));
    case "clock":
      return box(clockText(data.nowMs));
    case "gpsAccuracy":
      return box(
        now.accuracyM === null ? NO_VALUE : `±${Math.round(now.accuracyM)}`,
        "m",
      );
    case "live":
      return box(data.live ? t("Sharing live") : t("Not sharing"));
    case "thermalAssistant": {
      const size = Math.min(width, height) - 16;
      return (
        <View
          style={[
            styles.box,
            styles.drawing,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          testID={id}
        >
          <Text style={[styles.name, styles.corner, { color: palette.textMuted }]}>
            {name}
          </Text>
          <ThermalAssistant assistant={data.assistant} size={size} palette={palette} />
        </View>
      );
    }
    case "altitudeChart":
      return (
        <View
          style={[
            styles.box,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          testID={id}
        >
          <Text style={[styles.name, { color: palette.textMuted }]}>{name}</Text>
          <Text style={[styles.chartNow, { color: palette.text }]}>
            {altitudeText(now.altM, flight.altitude)} {UNIT_LABEL[flight.altitude]}
          </Text>
          <AltitudeChart
            series={data.altitudes}
            width={width - 20}
            height={Math.max(20, height - 70)}
            palette={palette}
            bands={bands}
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
    overflow: "hidden",
  },
  drawing: { alignItems: "center" },
  corner: { position: "absolute", top: 6, left: 10 },
  name: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", alignItems: "center", gap: GAP },
  number: { flexShrink: 1, flexDirection: "row", alignItems: "baseline", gap: GAP },
  value: { flexShrink: 1, fontWeight: fontWeight.bold, fontVariant: ["tabular-nums"] },
  unit: { fontWeight: fontWeight.semibold },
  under: { fontSize: 14, fontWeight: fontWeight.medium },
  chartNow: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
