import type { GymSet } from "@shaperoute/shared-types";
import { type StyleProp, Text, type TextProps, type TextStyle } from "react-native";

import { isTrackless } from "../activities/snow";
import { color } from "../theme/tokens";
import { gymPostEnergy, postEnergy } from "./postEnergy";
import type { SamplePost } from "./sampleFeed";

/**
 * A line of facts, «Star · 4.0 km · 19 min · 280 kcal», whose calories at
 * its end are in red (TASK-424 part C3, the user's choice of 2026-11-10:
 * «segnate con colore rosso in tutte»). The words are the same: a screen
 * reader hears one line.
 */

/** The calories that end the facts of `post`, as postFacts writes them. */
export function factsEnergy(
  post: SamplePost,
  sets?: readonly GymSet[] | null,
): string | null {
  return isTrackless(post.activity) ? gymPostEnergy(post, sets) : postEnergy(post);
}

export function FactsText({
  facts,
  kcal,
  style,
  energyColor = color.energy,
  ...rest
}: Omit<TextProps, "children" | "style"> & {
  facts: string;
  /** The calories at the end of `facts`, or null for none. */
  kcal: string | null;
  style?: StyleProp<TextStyle>;
  /** The red to use: `energyOnScrim` over a photo. */
  energyColor?: string;
}) {
  if (kcal === null || !facts.endsWith(kcal)) {
    return (
      <Text style={style} {...rest}>
        {facts}
      </Text>
    );
  }
  return (
    <Text style={style} {...rest}>
      {facts.slice(0, facts.length - kcal.length)}
      <Text style={{ color: energyColor }} testID="facts-kcal">
        {kcal}
      </Text>
    </Text>
  );
}
