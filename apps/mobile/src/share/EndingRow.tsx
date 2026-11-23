import { StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { color, fontSize, fontWeight } from "../theme/tokens";
import { ChoiceChips } from "./ScenesRows";
import { type Ending, ENDINGS, endingName } from "./videoScenes";

type Props = {
  ending: Ending;
  onChange: (ending: Ending) => void;
};

/**
 * «Ending» in «Edit video» (TASK-408, ADR-0339, part C2): what the video
 * ends on, as the user's choice 8 has it: the numbers, the whole drawing,
 * the heart of MuW, or all three. «Whole drawing» is the ending of before
 * and the one when the post opens; the MuW mark is in the corner always.
 */
export function EndingRow({ ending, onChange }: Props) {
  return (
    <>
      <Text style={styles.label}>{t("Ending")}</Text>
      <ChoiceChips
        choices={ENDINGS}
        chosen={ending}
        nameOf={endingName}
        onChange={onChange}
        testID="ending"
      />
    </>
  );
}

// As the labels of SharePost.
const styles = StyleSheet.create({
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
});
