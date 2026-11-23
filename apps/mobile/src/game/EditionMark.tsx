import type { GameEdition } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { color, fontSize, fontWeight, gamePrize, radius, space } from "../theme/tokens";
import { editionName } from "./prizesText";

type Props = {
  edition: GameEdition;
};

/**
 * The edition of an unlocked shape on its card (TASK-423 part E): a small
 * pill in silver or gold with its word. Bronze, the edition of every shape
 * unlocked, has none: the yellow of the shape says it.
 */
export function EditionMark({ edition }: Props) {
  if (edition === "bronze") {
    return null;
  }
  const tint = edition === "gold" ? gamePrize.gold : gamePrize.silver;
  return (
    <View style={[styles.pill, { borderColor: tint }]} testID={`edition-${edition}`}>
      <Text style={[styles.text, { color: tint }]}>{editionName(edition)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "center",
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: color.surfaceRaised,
  },
  text: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
  },
});
