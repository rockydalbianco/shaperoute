import { StyleSheet, Text, View } from "react-native";

import { color, fontSize, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { Avatar } from "./Avatar";

export const PROFILE_AVATAR_SIZE = 2 * MIN_TAP_SIZE;

type Props = {
  username: string;
  /** "" without one: no line. */
  bio: string;
  /** The picture as an `Image` shows it; null: the initial. */
  photo: string | null;
  /** A line under the name: the email on one's own, the drawings on another's. */
  detail: string;
};

/**
 * Who a profile is (TASK-116): the picture, the name, a line about it and
 * the bio. The same on one's own «Profile» and on another member's.
 */
export function ProfileHeader({ username, bio, photo, detail }: Props) {
  return (
    <View style={styles.who}>
      <Avatar name={username} size={PROFILE_AVATAR_SIZE} photo={photo} />
      <Text style={styles.username}>{username}</Text>
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
  username: {
    marginTop: space.sm,
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  detail: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  bio: {
    marginTop: space.sm,
    color: color.text,
    fontSize: fontSize.body,
    textAlign: "center",
  },
});
