import type { GamePrizesShown, ProfileBadge } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useGameCatalog } from "../game/gameCatalog";
import { GamePrizesRow } from "../game/GamePrizesRow";
import { isGamePrizesShown } from "../game/prizesApi";
import { ProfileFrame } from "../game/ProfileFrame";
import { Avatar } from "./Avatar";
import { BadgeRow } from "./BadgeRow";

export const PROFILE_AVATAR_SIZE = 2 * MIN_TAP_SIZE;

/** The «+» on the circle: small, the whole circle takes the tap. */
const PLUS_SIZE = space.xl + space.xs;

/** The circle as the button that changes one's own picture (TASK-207). */
export type PhotoButton = {
  /** The ways to change it are open under the header. */
  open: boolean;
  /** A change is on its way: no tap. */
  busy: boolean;
  onPress: () => void;
};

type Props = {
  username: string;
  /** "" without one: no line. */
  bio: string;
  /** The picture as an `Image` shows it; null: the initial. */
  photo: string | null;
  /** A line under the name: the email on one's own, the drawings on another's. */
  detail: string;
  /** One's own profile: the circle changes the picture; left out, it does not. */
  photoButton?: PhotoButton;
  /** It won a contest (`contest_wins` ≥ 1): the «Winner» badge under the name. */
  winner?: boolean;
  /**
   * The badges it earned (TASK-341), after «Winner»; null or left out from an
   * API older than TASK-341. Those still to earn are not here, on one's own
   * neither (TASK-457): «Badges» lower down says them.
   */
  badges?: readonly ProfileBadge[] | null;
  /**
   * The prizes of the shape game its owner chose to show (TASK-423 E2b):
   * the frame around the photo, the title and up to 3 badges under the
   * name; null or left out: none.
   */
  gamePrizes?: GamePrizesShown | null;
};

/** A frame's ring around the photo: the photo keeps its size inside it. */
const FRAME_RING = 7;

/**
 * Who a profile is (TASK-116): the picture, the name, a line about it and
 * the bio. The same on one's own «Profile» and on another member's; on
 * one's own the circle has a «+» and changes the picture (TASK-207). Who
 * won a contest has the «Winner» badge under the name, for good (TASK-299),
 * and the badges of the drawings follow it (TASK-341).
 */
export function ProfileHeader({
  username,
  bio,
  photo,
  detail,
  photoButton,
  winner = false,
  badges = null,
  gamePrizes = null,
}: Props) {
  const catalog = useGameCatalog();
  // Read as the API says it; a broken answer shows nothing.
  const prizes = isGamePrizesShown(gamePrizes) ? gamePrizes : null;
  const frame = prizes?.frame ?? null;
  const hardest =
    frame === null
      ? undefined
      : catalog?.shapes.filter((shape) => shape.collection === frame).at(-1);
  const photoCircle = (
    <Avatar name={username} size={PROFILE_AVATAR_SIZE} photo={photo} />
  );
  // A frame the catalog on the phone knows goes around the photo.
  const framed = frame !== null && hardest !== undefined;
  const side = framed ? PROFILE_AVATAR_SIZE + 2 * FRAME_RING : PROFILE_AVATAR_SIZE;
  const avatar =
    framed && hardest !== undefined ? (
      <ProfileFrame
        collection={frame}
        outline={hardest.outline}
        size={side}
        got
        badgeSide="left"
        testID="profile-frame"
      >
        {photoCircle}
      </ProfileFrame>
    ) : (
      photoCircle
    );
  return (
    <View style={styles.who}>
      {photoButton === undefined ? (
        avatar
      ) : (
        <Tap
          style={[styles.circle, { width: side, height: side }]}
          onPress={photoButton.onPress}
          disabled={photoButton.busy}
          accessibilityRole="button"
          // One name for the circle: the letter and the «+» are not read.
          accessibilityLabel={t("Profile picture")}
          accessibilityState={{
            expanded: photoButton.open,
            disabled: photoButton.busy,
            busy: photoButton.busy,
          }}
        >
          {avatar}
          <View style={styles.plus} testID="photo-plus">
            <Text style={styles.plusText}>+</Text>
          </View>
        </Tap>
      )}
      <Text style={styles.username}>{username}</Text>
      <GamePrizesRow shown={prizes} />
      <BadgeRow winner={winner} badges={badges} />
      <Text style={styles.detail}>{detail}</Text>
      {bio !== "" && <Text style={styles.bio}>{bio}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  who: {
    alignItems: "center",
    gap: space.xs,
    paddingBottom: space.sm,
  },
  circle: {
    width: PROFILE_AVATAR_SIZE,
    height: PROFILE_AVATAR_SIZE,
  },
  // White on the dark ring of the page: the yellow belongs to the route.
  plus: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: PLUS_SIZE,
    height: PLUS_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.background,
    backgroundColor: color.text,
  },
  plusText: {
    color: color.background,
    fontSize: fontSize.input + space.xs,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.input + space.sm,
  },
  // The name large and light, as a page's title (TASK-339 D).
  username: {
    ...font.title,
    marginTop: space.sm,
    color: color.text,
  },
  detail: {
    ...font.small,
    color: color.textMuted,
  },
  bio: {
    ...font.body,
    marginTop: space.sm,
    color: color.text,
    textAlign: "center",
  },
});
