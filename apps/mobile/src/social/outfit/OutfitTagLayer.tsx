import type { DrawingPhoto, OutfitTag } from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { color, font, MIN_TAP_SIZE, space } from "../../theme/tokens";
import { useFollowsDoor } from "../followsDoor";
import { OutfitTagSheet } from "./OutfitTagSheet";
import { inBox, photoFrame, pointIn, tagsOfPhoto, totalsOf } from "./outfitTags";
import { dotLabel, outfitWords, taggedLabel, yourItemsLine } from "./outfitWords";

/** The dot as it is seen, as Style's; the finger has `MIN_TAP_SIZE` around it. */
const DOT = 18;
/** The round of the hanger. */
const HANGER = 30;

type Props = {
  /** The photo, with its size and its items. */
  photo: DrawingPhoto;
  /** How the photo is drawn in the box: cut to fill it, or whole. */
  fit: "cover" | "contain";
  /**
   * What shows the dots: the hanger alone, where a tap on the photo opens the
   * drawing (the Feed, the user's choice of 2026-11-06); or a tap on the
   * photo too, where it does nothing else (a drawing opened).
   */
  toggle: "hanger" | "photo";
  /** Who tagged them; none for a drawing of nobody's. */
  author: { public_id: string; username: string } | null;
  /** Where the hanger sits; by default the top left corner. */
  hangerStyle?: ViewStyle;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
};

/**
 * The items a member tagged on a photo (TASK-394 part B, ADR-0333), over
 * the photo: a hanger in a corner says there are some, and a tap shows the
 * dots, another hides them, so a real person's photo stays clean (the user's
 * choice 4); Style's posts show theirs always. A dot opens the item's sheet.
 * Nothing without items, or without a session to ask the shop with.
 */
export function OutfitTagLayer({
  photo,
  fit,
  toggle,
  author,
  hangerStyle,
  fetchFn,
}: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState<OutfitTag | null>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const tags = tagsOfPhoto(photo);
  if (tags.length === 0 || apiUrl === null || account.state.status !== "signedIn") {
    return null;
  }
  const token = account.state.session.token;
  const label = taggedLabel(tags.length);
  const frame = box === null ? null : photoFrame(box, photo, fit);
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={({ nativeEvent }) =>
        setBox({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })
      }
      testID="outfit-layer"
    >
      {toggle === "photo" && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShown((was) => !was)}
          accessible={false}
          testID="outfit-photo-tap"
        />
      )}
      {shown &&
        frame !== null &&
        box !== null &&
        tags.map((tag) => {
          const point = pointIn(frame, tag.x, tag.y);
          if (!inBox(box, point)) {
            return null;
          }
          return (
            <Pressable
              key={tag.id}
              style={[
                styles.dotTap,
                {
                  left: point.left - MIN_TAP_SIZE / 2,
                  top: point.top - MIN_TAP_SIZE / 2,
                },
              ]}
              onPress={() => setOpen(tag)}
              accessibilityRole="button"
              accessibilityLabel={dotLabel(tag.item, tag.brand)}
              testID={`outfit-tag-${tag.id}`}
            >
              <View style={[styles.dot, tag.hidden && styles.dotHidden]} />
            </Pressable>
          );
        })}
      <Pressable
        style={[styles.hanger, hangerStyle]}
        onPress={() => setShown((was) => !was)}
        hitSlop={(MIN_TAP_SIZE - HANGER) / 2}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: shown }}
        testID="outfit-hanger"
      >
        <Hanger />
      </Pressable>
      {open !== null && (
        <OutfitTagSheet
          tag={open}
          author={author}
          apiUrl={apiUrl}
          token={token}
          onSessionEnded={account.sessionEnded}
          onClose={() => setOpen(null)}
          fetchFn={fetchFn}
        />
      )}
    </View>
  );
}

/** A clothes hanger, drawn: its hook, its two shoulders and its bar. */
function Hanger() {
  return (
    <View style={styles.drawn} accessible={false}>
      <View style={styles.hook} />
      <View style={styles.stem} />
      <View style={[styles.shoulder, styles.left]} />
      <View style={[styles.shoulder, styles.right]} />
      <View style={styles.bar} />
    </View>
  );
}

/**
 * Under the photos of a post, to its author only: how many times its items
 * were opened and how many times someone went to the shop, in all (the
 * user's choice 5). The others get no totals from the API, and see nothing.
 */
export function OutfitTotals({ photos }: { photos: readonly DrawingPhoto[] }) {
  const totals = totalsOf(photos.flatMap((photo) => tagsOfPhoto(photo)));
  if (totals === null) {
    return null;
  }
  return (
    <View style={styles.totals} testID="outfit-totals">
      <Text style={styles.totalsText}>{yourItemsLine(totals.opens, totals.shops)}</Text>
      <Text style={styles.onlyYou}>{outfitWords().onlyYou}</Text>
    </View>
  );
}

const LINE = 2;
// The shoulders run from the stem's foot (10, 5) down to the bar's ends
// (0, 13) and (20, 13): 12.8 long, 38.7° from level.
const SHOULDER = 12.8;

const styles = StyleSheet.create({
  dotTap: {
    position: "absolute",
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  // White with a dark edge, as Style's: seen on any photo, light or dark.
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: color.scrim,
    backgroundColor: color.onScrim,
  },
  // Hidden from the others after a report: its owner sees it faded.
  dotHidden: {
    opacity: 0.5,
  },
  // As the page counter of the Feed: light on a dark round.
  hanger: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    width: HANGER,
    height: HANGER,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: HANGER / 2,
    backgroundColor: color.scrim,
    opacity: 0.85,
  },
  drawn: {
    width: 20,
    height: 15,
  },
  hook: {
    position: "absolute",
    left: 8,
    top: -1,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1.5,
    borderColor: color.onScrim,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    transform: [{ rotate: "-45deg" }],
  },
  stem: {
    position: "absolute",
    left: 9.25,
    top: 3,
    width: 1.5,
    height: 3,
    backgroundColor: color.onScrim,
  },
  shoulder: {
    position: "absolute",
    top: 9 - LINE / 2,
    width: SHOULDER,
    height: LINE,
    borderRadius: LINE / 2,
    backgroundColor: color.onScrim,
  },
  left: {
    left: 5 - SHOULDER / 2,
    transform: [{ rotate: "-38.7deg" }],
  },
  right: {
    left: 15 - SHOULDER / 2,
    transform: [{ rotate: "38.7deg" }],
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 13 - LINE / 2,
    width: 20,
    height: LINE,
    borderRadius: LINE / 2,
    backgroundColor: color.onScrim,
  },
  totals: {
    gap: 2,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  totalsText: {
    ...font.small,
    color: color.text,
  },
  onlyYou: {
    ...font.detail,
    color: color.textMuted,
  },
});
