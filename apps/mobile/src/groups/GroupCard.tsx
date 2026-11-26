import type { Group } from "@shaperoute/shared-types";
import { Image, StyleSheet, Text, View } from "react-native";

import { tPlural } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { groupIcon, groupPhotoUri, sportsLabel } from "./groupText";

/** The side of a group's picture on a card and on its page. */
export const CARD_PHOTO = MIN_TAP_SIZE;

/**
 * A group's photo, or its first sport's icon without one (GRUPPI.md §2),
 * as a rounded square of `size`.
 */
export function GroupPicture({
  group,
  size,
  big = false,
}: {
  group: Pick<Group, "photo" | "sports"> & { big_photo?: string | null };
  size: number;
  /** The page's own: the bigger photo when there is one. */
  big?: boolean;
}) {
  const uri = groupPhotoUri((big ? group.big_photo : null) ?? group.photo);
  const side = { width: size, height: size };
  if (uri !== null) {
    return (
      <Image
        source={{ uri }}
        style={[styles.picture, side]}
        accessibilityIgnoresInvertColors
        testID="group-photo"
      />
    );
  }
  return (
    <View style={[styles.picture, styles.icon, side]} testID="group-icon">
      <Text style={{ fontSize: Math.round(size * 0.5) }}>{groupIcon(group)}</Text>
    </View>
  );
}

/**
 * A group in a list (TASK-495 part B): its picture, its name, its sports,
 * the city and how many are in it. A touch calls `onOpen`.
 */
export function GroupCard({ group, onOpen }: { group: Group; onOpen: () => void }) {
  return (
    <Tap
      style={styles.card}
      onPress={onOpen}
      accessibilityRole="button"
      testID={`group-card-${group.id}`}
    >
      <GroupPicture group={group} size={CARD_PHOTO} />
      <View style={styles.words}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.facts} numberOfLines={1}>
          {sportsLabel(group.sports)}
        </Text>
        <Text style={styles.facts} numberOfLines={1}>
          {group.city} · {tPlural(group.members, "{count} member", "{count} members")}
        </Text>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  picture: {
    borderRadius: radius.lg,
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceRaised,
  },
  card: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  words: {
    flex: 1,
    gap: space.xs,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  facts: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
