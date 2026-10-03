import type { User } from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { DrawingsGrid } from "../social/DrawingsGrid";
import { PHOTO_BUSY_TEXT, PhotoChoices } from "./PhotoChoices";
import { ProfileHeader } from "./ProfileHeader";
import { bioOf } from "./profileFields";
import { useProfilePhoto } from "./useProfilePhoto";

/** What «Profile» opens from its first page. */
export type ProfileSection = "favorites" | "activities" | "settings";

/** The pictures of the sections: emoji, the only colour that is not a token. */
export const SECTION_EMOJI: Record<ProfileSection, string> = {
  favorites: "❤️",
  activities: "🏃‍♂️",
  settings: "⚙️",
};

type Props = {
  user: User;
  /** How many routes the account keeps; null until the list has come. */
  favorites: number | null;
  /** How many runs it recorded; null until the list has come. */
  activities: number | null;
  onOpen: (section: ProfileSection) => void;
  /** «Edit profile»: username and bio (TASK-116). */
  onEdit: () => void;
};

/**
 * The first page of «Profile» with an account (TASK-177): who it is, with
 * the bio and «Edit profile» (TASK-116), what it keeps in two tiles with
 * their number, the way to «Settings», and the drawings it made public
 * (TASK-117), as the others see them. A tap on the circle opens the ways
 * to change the picture under it, as the row of «Settings» (TASK-207).
 */
export function ProfileHome({ user, favorites, activities, onOpen, onEdit }: Props) {
  const photo = useProfilePhoto();
  const [photoOpen, setPhotoOpen] = useState(false);
  const busyText = photo.busy === null ? null : PHOTO_BUSY_TEXT[photo.busy];
  return (
    <View style={styles.home}>
      <View style={styles.top}>
        <ProfileHeader
          username={user.username}
          bio={bioOf(user)}
          photo={photo.uri}
          detail={user.email}
          photoButton={{
            open: photoOpen,
            busy: photo.busy !== null,
            onPress: () => {
              photo.clearProblem();
              setPhotoOpen(!photoOpen);
            },
          }}
        />
        {photoOpen && (
          // In a box, as under the row of «Settings»: apart from «Edit profile».
          <View style={styles.photoMenu}>
            <PhotoChoices photo={photo} onChosen={() => setPhotoOpen(false)} />
          </View>
        )}
        {busyText !== null && <Text style={styles.photoNote}>{busyText}</Text>}
        {photo.problem !== null && <Text style={styles.problem}>{photo.problem}</Text>}
        <Pressable
          style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
          onPress={onEdit}
          accessibilityRole="button"
        >
          <Text style={styles.editText}>Edit profile</Text>
        </Pressable>
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
      <DrawingsGrid publicId={user.public_id ?? null} own />
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
  top: {
    gap: space.md,
  },
  photoMenu: {
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  photoNote: {
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "center",
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
    textAlign: "center",
  },
  // Neutral, as «Log out»: the yellow belongs to the route.
  edit: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  editText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
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
