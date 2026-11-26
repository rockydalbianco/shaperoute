import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { Avatar } from "../profile/Avatar";
import { color, radius } from "../theme/tokens";

/** What an `Image` reads a picture on the API with: its address and the
 * headers of every other call (the token, the API's key). */
export type CommentPicture = { uri: string; headers: Record<string, string> };

type Props = {
  /** Who wrote the comment: the first letter stands for them. */
  name: string;
  /** The side of the circle. */
  size: number;
  /**
   * Their picture at its own address on the API (TASK-497), as a comment's
   * author carries it; null without one.
   */
  source: CommentPicture | null;
  /** Their picture from the profile, the way of an API from before; null: none. */
  photo?: string | null;
};

/**
 * Who wrote a comment, in a circle. The picture at its address is drawn
 * **over the letter**: while it is read, and when it does not come (no
 * network, a block since), the letter shows, as it did while the profile
 * was asked for.
 */
export function CommentAvatar({ name, size, source, photo = null }: Props) {
  // The address that did not answer: another address is tried again.
  const [failed, setFailed] = useState<string | null>(null);
  const shown = source !== null && source.uri !== failed ? source : null;
  return (
    <View style={{ width: size, height: size }}>
      <Avatar name={name} size={size} photo={photo} />
      {shown !== null && (
        <Image
          source={shown}
          style={[styles.over, { width: size, height: size }]}
          onError={() => setFailed(shown.uri)}
          testID="comment-author-photo"
          // A photo keeps its colours when the phone inverts the screen.
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The circle of `Avatar`, without a ground of its own: the letter shows
  // through until the picture is there.
  over: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.borderStrong,
  },
});
