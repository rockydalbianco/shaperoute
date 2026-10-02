import type { User } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Avatar } from "./Avatar";
import { useProfilePhoto } from "./useProfilePhoto";

/** What «Profile» opens from its first page. */
export type ProfileSection = "favorites" | "activities" | "settings";

/** The pictures of the sections: emoji, the only colour that is not a token. */
export const SECTION_EMOJI: Record<ProfileSection, string> = {
  favorites: "❤️",
  activities: "🏃‍♂️",
  settings: "⚙️",
};

const AVATAR_SIZE = 2 * MIN_TAP_SIZE;

type Props = {
  user: User;
  /** How many routes the account keeps; null until the list has come. */
  favorites: number | null;
  /** How many runs it recorded; null until the list has come. */
  activities: number | null;
  onOpen: (section: ProfileSection) => void;
};

/**
 * The first page of «Profile» with an account (TASK-177): who it is, what it
 * keeps in two tiles with their number, and the way to «Settings».
 */
export function ProfileHome({ user, favorites, activities, onOpen }: Props) {
  const photo = useProfilePhoto();
  return (
    <View style={styles.home}>
      <View style={styles.who}>
        <Avatar name={user.username} size={AVATAR_SIZE} photo={photo.uri} />
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>
      <View style={styles.tiles}>
        <Tile
          emoji={SECTION_EMOJI.favorites}
          name="Favorites"
          count={favorites}
          onPress={() => onOpen("favorites")}
        />
        <Tile
          emoji={SECTION_EMOJI.activities}
          name="My activities"
          count={activities}
          onPress={() => onOpen("activities")}
        />
      </View>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={() => onOpen("settings")}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <View style={styles.badge}>
          <Text style={styles.emoji}>{SECTION_EMOJI.settings}</Text>
        </View>
        <Text style={styles.rowText}>Settings</Text>
        <Text style={styles.rowArrow}>›</Text>
      </Pressable>
    </View>
  );
}

function Tile({
  emoji,
  name,
  count,
  onPress,
}: {
  emoji: string;
  name: string;
  count: number | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      // One name for the whole tile: the emoji is not read on its own.
      accessibilityLabel={count !== null ? `${name}, ${count}` : name}
    >
      <View style={styles.tileTop}>
        <View style={styles.badge}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <Text style={styles.rowArrow}>›</Text>
      </View>
      <Text style={[styles.count, count === null && styles.countUnknown]}>
        {count !== null ? String(count) : "–"}
      </Text>
      <Text style={styles.tileName}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  home: {
    gap: space.lg,
  },
  who: {
    alignItems: "center",
    gap: space.xs,
    paddingBottom: space.sm,
  },
  username: {
    marginTop: space.sm,
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  email: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  tiles: {
    flexDirection: "row",
    gap: space.md,
  },
  tile: {
    flex: 1,
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  tileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  badge: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  emoji: {
    fontSize: fontSize.title - space.xs,
  },
  count: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  countUnknown: {
    color: color.textFaint,
  },
  tileName: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  rowText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  rowArrow: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
});
