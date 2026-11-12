import type { User } from "@shaperoute/shared-types";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useBlocksVersion } from "../social/blockedNow";
import { FollowLists } from "../social/FollowLists";
import { useFollowsDoor } from "../social/followsDoor";
import { TAB_ICON_SIZE } from "../tabs/TabBar";
import { Tap } from "../ui/Tap";
import { BadgesSection } from "./BadgesSection";
import { FirstStep, profileStage } from "./FirstStep";
import { photoBusyText, PhotoChoices } from "./PhotoChoices";
import { ProfileGallery } from "./ProfileGallery";
import { ProfileHeader } from "./ProfileHeader";
import { OwnVo2Max } from "./OwnVo2Max";
import { GymLevels } from "../gym/GymLevels";
import { WeekStrip } from "../activities/WeekStrip";
import { PersonalBests } from "./PersonalBests";
import { ProfileStats, totalsOf, useOwnProfile } from "./ProfileStats";
import { bioOf } from "./profileFields";
import { useProfilePhoto } from "./useProfilePhoto";

/** The gear of «Settings», from Lucide as the tab bar's icons (TASK-367). */
const GEAR = require("../../assets/ui/tabs/settings.png");

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
  /** The first step of a new profile opens «Explore» (TASK-457); left out,
   * its card has no button. */
  onExplore?: () => void;
};

/**
 * The first page of «Profile» with an account (TASK-177): who it is, with
 * the bio and «Edit profile» (TASK-116), who asks to follow it, who does
 * and whom it follows (TASK-211), what it keeps in two tiles with their
 * number, the way to «Settings» (its gear at the top right since
 * TASK-367), and the drawings it made public
 * (TASK-117), as the others see them. A tap on the circle opens the ways
 * to change the picture under it, as the row of «Settings» (TASK-207).
 * After a block the lists of who follows are read again: a block ends
 * every follow. «Messages» is a tab of its own (TASK-367). Its totals under
 * «Edit profile», and its drawings and photos at the bottom, as the others
 * see them (TASK-324).
 *
 * In blocks, top to bottom (TASK-457): who it is; what it did (the totals
 * and the week, or the first step while nothing was done, then bests, VO₂
 * max and gym); who follows; what it keeps; its badges; what it made.
 * «Guide» and «Blocked people» are in «Settings»: this page says only what
 * is of the account.
 */
export function ProfileHome({
  user,
  favorites,
  activities,
  onOpen,
  onEdit,
  onExplore,
}: Props) {
  const photo = useProfilePhoto();
  const blocks = useBlocksVersion();
  const { apiUrl, account } = useFollowsDoor();
  const publicId = user.public_id ?? null;
  // Null while it comes; the totals also from an API older than TASK-324.
  const own = useOwnProfile(publicId);
  const totals = own === null ? null : totalsOf(own);
  // Nothing done yet: the first step, not a row of zeros (TASK-457). An API
  // without the totals says nothing of it: the profile as it was.
  const stage =
    own !== null && totals === null ? "active" : profileStage(activities, totals);
  const [photoOpen, setPhotoOpen] = useState(false);
  const busyText = photoBusyText(photo.busy);
  return (
    <View style={styles.home}>
      {/* «Settings» at the top right, as Instagram's (TASK-367, ADR-0311). */}
      <Tap
        style={styles.gear}
        onPress={() => onOpen("settings")}
        accessibilityRole="button"
        accessibilityLabel={t("Settings")}
        hitSlop={space.xs}
      >
        <Image source={GEAR} style={styles.gearIcon} />
      </Tap>
      <View style={styles.top}>
        <ProfileHeader
          username={user.username}
          bio={bioOf(user)}
          photo={photo.uri}
          detail={user.email}
          // The profile's count has the gym's monthly wins too (TASK-385 F).
          winner={(own?.contest_wins ?? user.contest_wins ?? 0) > 0}
          badges={own?.badges ?? null}
          gamePrizes={own?.game_prizes ?? null}
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
          <Text style={styles.editText}>{t("Edit profile")}</Text>
        </Pressable>
        {/* What it did: the totals, then the week and the calendar of every
            sport (TASK-462; nothing from an API without it). */}
        {stage === "active" && totals !== null && <ProfileStats totals={totals} />}
        {stage === "active" && <WeekStrip bests={own?.personal_bests} />}
        {stage === "new" && <FirstStep onExplore={onExplore} />}
        {/* The personal bests (TASK-368): none from an older API. */}
        {own?.personal_bests && <PersonalBests bests={own.personal_bests} />}
        {/* The VO₂ max (TASK-397): none from an API older than it. */}
        {own?.vo2max !== undefined && <OwnVo2Max />}
        {/* The levels at the gym (TASK-385 E): none from an older API. */}
        {own?.gym_levels && <GymLevels levels={own.gym_levels} own />}
      </View>
      {/* Built again at every block and unblock: it reads its lists anew. */}
      <FollowLists key={blocks} />
      {/* What it keeps. */}
      <View style={styles.tiles}>
        <Tile
          emoji={SECTION_EMOJI.favorites}
          name={t("Favorites")}
          count={favorites}
          onPress={() => onOpen("favorites")}
        />
        <Tile
          emoji={SECTION_EMOJI.activities}
          name={t("My activities")}
          count={activities}
          onPress={() => onOpen("activities")}
        />
      </View>
      {/* The badges of the drawings, with how each is earned (TASK-457). */}
      <BadgesSection badges={own?.badges ?? null} />
      {/* What it made. */}
      <ProfileGallery
        publicId={publicId}
        own
        photos={totals !== null}
        apiUrl={apiUrl}
        token={account.state.status === "signedIn" ? account.state.session.token : null}
        onSessionEnded={account.sessionEnded}
      />
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
      accessibilityLabel={count !== null && count > 0 ? `${name}, ${count}` : name}
    >
      <View style={styles.tileTop}>
        <View style={styles.badge}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <Text style={styles.rowArrow}>›</Text>
      </View>
      {/* Nothing kept yet: the name alone, not a zero (TASK-457). */}
      {count !== 0 && (
        <Text style={[styles.count, count === null && styles.countUnknown]}>
          {count !== null ? String(count) : "–"}
        </Text>
      )}
      <Text style={styles.tileName}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gear: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 1,
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  gearIcon: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    tintColor: color.text,
  },
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
  // The name at the bottom, also in a tile without its number: beside a
  // tile that has one, the two names stay on one line (TASK-457).
  tile: {
    flex: 1,
    justifyContent: "space-between",
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
  pressed: {
    opacity: 0.6,
  },
  rowArrow: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
});
