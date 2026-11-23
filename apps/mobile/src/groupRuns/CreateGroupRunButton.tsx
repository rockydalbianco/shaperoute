import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import type { Keepable } from "../favorites/favoriteRoute";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import { color, fontSize, MIN_TAP_SIZE, radius } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { GroupRunForm } from "./GroupRunForm";
import { openGroupRunPage } from "./groupRunDoor";

/** A flag as text, not as an emoji: the app has no icons. The meeting point. */
export const GROUP_RUN_GLYPH = "⚑";

type Props = {
  /** The route on the map, as the heart keeps it. */
  route: Keepable;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * «Create group run» under the heart (TASK-309 part B): the route on the map
 * published as a group run, with the form over everything. Published, its
 * page opens. Only for somebody signed in: a group run has an organiser.
 */
export function CreateGroupRunButton({ route, fetchFn, apiKey }: Props) {
  const { account } = useFollowsDoor();
  const [open, setOpen] = useState(false);
  if (account.state.status !== "signedIn") {
    return null;
  }
  return (
    <>
      <Tap
        style={styles.button}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("Create group run")}
        testID="create-group-run"
      >
        <Text style={styles.glyph}>{GROUP_RUN_GLYPH}</Text>
      </Tap>
      {open && (
        <GroupRunForm
          mode={{ kind: "new", route }}
          onClose={() => setOpen(false)}
          onDone={(run) => {
            setOpen(false);
            openGroupRunPage(run.id);
          }}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // As the heart above it: neutral, the yellow is the route's.
  button: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  glyph: {
    color: color.text,
    fontSize: fontSize.title,
  },
});
