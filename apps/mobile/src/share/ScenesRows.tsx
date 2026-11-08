import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import {
  CUTS,
  cutName,
  moved,
  OPENINGS,
  openingName,
  ROUTE_CAMERAS,
  routeCameraName,
  type SceneName,
  sceneName,
  switched,
} from "./videoScenes";
import type { VideoEdit } from "./videoEdit";

type Props = {
  edit: VideoEdit;
  onChange: (part: Partial<VideoEdit>) => void;
};

/**
 * «Scenes» in «Edit video» (TASK-408, ADR-0339, part C2): the opening, the
 * route and the ending side by side in the video's order, as the board
 * draws them («Opening › The route › Ending»). A scene turns on and off
 * with a tap, and moves left or right with its arrows; the last one on
 * stays on. Under them, what the opening shows and how it gives way to
 * the next scene, and on «3D» how the route is seen (part C2b). The video
 * lasts 12 seconds whatever is on.
 */
export function ScenesRows({ edit, onChange }: Props) {
  const lastOn = edit.off.length >= edit.order.length - 1;
  const openingOn = !edit.off.includes("opening");
  // How the route is seen: a choice on «3D» only (part C2b, choice 12).
  const cameraChoice = edit.style === "3d" && !edit.off.includes("route");
  return (
    <>
      <Text style={styles.label}>{t("Scenes")}</Text>
      <View style={styles.strip}>
        {edit.order.map((scene, i) => {
          const on = !edit.off.includes(scene);
          return (
            <View key={scene} style={[styles.card, on && styles.cardOn]}>
              <Pressable
                style={styles.toggle}
                onPress={() => onChange({ off: switched(edit.off, scene, !on) })}
                accessibilityRole="switch"
                accessibilityLabel={sceneName(scene)}
                accessibilityState={{ checked: on, disabled: on && lastOn }}
                testID={`scene-${scene}`}
              >
                <Text style={[styles.name, on && styles.nameOn]} numberOfLines={2}>
                  {sceneName(scene)}
                </Text>
                <View style={[styles.track, on && styles.trackOn]}>
                  <View style={[styles.knob, on && styles.knobOn]} />
                </View>
              </Pressable>
              <View style={styles.arrows}>
                <Arrow
                  scene={scene}
                  by={-1}
                  edit={edit}
                  onChange={onChange}
                  hidden={i === 0}
                />
                <Arrow
                  scene={scene}
                  by={1}
                  edit={edit}
                  onChange={onChange}
                  hidden={i === edit.order.length - 1}
                />
              </View>
            </View>
          );
        })}
      </View>
      {lastOn && <Text style={styles.hint}>{t("At least one scene stays on.")}</Text>}
      {openingOn && (
        <>
          <Text style={styles.label}>{t("Opening")}</Text>
          <ChoiceChips
            choices={OPENINGS}
            chosen={edit.opening}
            nameOf={openingName}
            onChange={(opening) => onChange({ opening })}
            testID="opening"
          />
          <ChoiceChips
            choices={CUTS}
            chosen={edit.cut}
            nameOf={cutName}
            onChange={(cut) => onChange({ cut })}
            testID="cut"
          />
        </>
      )}
      {cameraChoice && (
        <>
          <Text style={styles.label}>{t("The route")}</Text>
          <ChoiceChips
            choices={ROUTE_CAMERAS}
            chosen={edit.camera}
            nameOf={routeCameraName}
            onChange={(camera) => onChange({ camera })}
            testID="camera"
          />
        </>
      )}
    </>
  );
}

function Arrow({
  scene,
  by,
  edit,
  onChange,
  hidden,
}: {
  scene: SceneName;
  by: -1 | 1;
  edit: VideoEdit;
  onChange: (part: Partial<VideoEdit>) => void;
  hidden: boolean;
}) {
  if (hidden) {
    return <View style={styles.arrow} />;
  }
  return (
    <Pressable
      style={styles.arrow}
      onPress={() => onChange({ order: moved(edit.order, scene, by) })}
      accessibilityRole="button"
      accessibilityLabel={`${sceneName(scene)}, ${by < 0 ? t("Move left") : t("Move right")}`}
      testID={`scene-${scene}-${by < 0 ? "left" : "right"}`}
    >
      <Text style={styles.arrowText}>{by < 0 ? "‹" : "›"}</Text>
    </Pressable>
  );
}

type ChipsProps<T extends string> = {
  choices: readonly T[];
  chosen: T;
  nameOf: (choice: T) => string;
  onChange: (choice: T) => void;
  /** `${testID}-${choice}` for each chip. */
  testID: string;
};

/** One choice among a few, as the chips of «Music». */
export function ChoiceChips<T extends string>({
  choices,
  chosen,
  nameOf,
  onChange,
  testID,
}: ChipsProps<T>) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {choices.map((choice) => {
        const on = choice === chosen;
        return (
          <Pressable
            key={choice}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onChange(choice)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            testID={`${testID}-${choice}`}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {nameOf(choice)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const KNOB = 18;

const styles = StyleSheet.create({
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  hint: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  strip: {
    flexDirection: "row",
    gap: space.sm,
  },
  card: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  cardOn: {
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  toggle: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.xs,
    paddingTop: space.sm,
  },
  name: {
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "center",
  },
  nameOn: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  // As the switches of the run's page, smaller.
  track: {
    width: KNOB * 2 + 4,
    height: KNOB + 4,
    borderRadius: (KNOB + 4) / 2,
    padding: 2,
    backgroundColor: color.border,
  },
  trackOn: {
    backgroundColor: color.accent,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: color.textMuted,
  },
  knobOn: {
    marginLeft: KNOB,
    backgroundColor: color.onAccent,
  },
  arrows: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  arrow: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chipOn: {
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  chipText: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  chipTextOn: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
});
