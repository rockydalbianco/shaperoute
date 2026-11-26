import { StyleSheet, Switch, Text, View } from "react-native";

import { t } from "../i18n";
import { color, fontSize, fontWeight, space } from "../theme/tokens";

/** What the API said of the post's «Together»: nothing to show (an API of
 * before, somebody else's post, no connection), nobody who ran with the
 * author, or the runners there are. */
export type TogetherState =
  { kind: "none" } | { kind: "alone" } | { kind: "ready"; people: number };

type Props = {
  state: TogetherState;
  on: boolean;
  onChange: (on: boolean) => void;
};

/**
 * «Together» in «Edit video» (TASK-417 part D2b, the texts approved on
 * 2026-11-08): a switch that puts the people tagged who ran with the author
 * in the video, on the same clock. Off, with «No one tagged ran at the same
 * time.», when nobody did; not there at all when the API has nothing to
 * say, as for a run that is not a post of the Feed.
 */
export function TogetherRow({ state, on, onChange }: Props) {
  if (state.kind === "none") {
    return null;
  }
  const alone = state.kind === "alone";
  return (
    <View style={styles.row} testID="together-row">
      <View style={styles.words}>
        <Text style={styles.title}>{t("Together")}</Text>
        <Text style={styles.note}>
          {alone
            ? t("No one tagged ran at the same time.")
            : t("Your run and the runs of the people tagged here, on the same clock.")}
        </Text>
        {!alone && <Text style={styles.note}>{t("Up to 4 people in one video.")}</Text>}
      </View>
      <Switch
        value={on && !alone}
        onValueChange={onChange}
        disabled={alone}
        accessibilityLabel={t("Together")}
        testID="together-switch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  words: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
