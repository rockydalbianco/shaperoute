import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { languageOption } from "../i18n/languages";
import { useLanguage } from "../i18n/useLanguage";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import {
  type AboutBlock,
  type AboutId,
  aboutDocument,
  aboutLanguage,
  PLACEHOLDER_PATTERN,
} from "./documents";

type Props = {
  /** Which of the three texts of «ABOUT». */
  id: AboutId;
};

/**
 * «Help», «Terms» or «Privacy» as a page of «Profile» (TASK-184, ADR-0205):
 * the text's name, then its sections, each under its heading. The page of
 * «Profile» scrolls it and has the «←» back to «Settings».
 *
 * A draft says so first, before its name is read as a promise: the legal
 * texts are not final until the user approves them. What is still to fill
 * is written in square brackets and stands out.
 *
 * With the app in a language the texts are not written in yet, they are in
 * English, and VoiceOver is told so.
 */
export function AboutPage({ id }: Props) {
  const language = useLanguage();
  const text = aboutDocument(id, language);
  const speech = languageOption(aboutLanguage(language)).speech;
  return (
    <View style={styles.page}>
      {text.draft && (
        // One thing to hear, not two lines to find.
        <View style={styles.draft} accessible>
          <Text style={styles.draftText}>{t("Draft — not final yet.")}</Text>
          {text.updated !== null && (
            <Text style={styles.updated}>
              {t("Last updated: {date}", { date: text.updated })}
            </Text>
          )}
        </View>
      )}
      <Text
        style={styles.title}
        accessibilityRole="header"
        accessibilityLanguage={speech}
      >
        {text.title}
      </Text>
      {text.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text
            style={styles.heading}
            accessibilityRole="header"
            accessibilityLanguage={speech}
          >
            {section.heading}
          </Text>
          {section.blocks.map((block, at) => (
            <Block key={at} block={block} speech={speech} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Block({ block, speech }: { block: AboutBlock; speech: string }) {
  if (typeof block === "string") {
    return (
      <Text style={styles.paragraph} accessibilityLanguage={speech}>
        <Marked text={block} />
      </Text>
    );
  }
  return (
    <View style={styles.bullets}>
      {block.bullets.map((bullet) => (
        <View key={bullet} style={styles.bullet}>
          {/* The dot is drawing, not text: VoiceOver reads the point only. */}
          <Text
            style={styles.dot}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            •
          </Text>
          <Text style={styles.bulletText} accessibilityLanguage={speech}>
            <Marked text={bullet} />
          </Text>
        </View>
      ))}
    </View>
  );
}

/** `text` with what is still to fill, «[name]», standing out. */
function Marked({ text }: { text: string }) {
  const parts = text.split(PLACEHOLDER_PATTERN);
  if (parts.length === 1) {
    return text;
  }
  return parts.map((part, at) =>
    // `split` with a group puts what matched at the odd places.
    at % 2 === 1 ? (
      <Text key={at} style={styles.placeholder}>
        {part}
      </Text>
    ) : (
      part
    ),
  );
}

const styles = StyleSheet.create({
  page: {
    gap: space.xl,
  },
  // Quiet, and not yellow: the yellow belongs to the route (docs/UI.md,
  // «Il tema»). `warning` is for what the user should know.
  draft: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.warning,
    backgroundColor: color.surface,
  },
  draftText: {
    color: color.warning,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  updated: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  title: {
    color: color.text,
    fontSize: fontSize.input + space.xs,
    fontWeight: fontWeight.bold,
  },
  section: {
    gap: space.md,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  paragraph: {
    color: color.text,
    fontSize: fontSize.body,
    lineHeight: fontSize.body + space.sm,
  },
  bullets: {
    gap: space.sm,
  },
  bullet: {
    flexDirection: "row",
    gap: space.sm,
  },
  dot: {
    color: color.textMuted,
    fontSize: fontSize.body,
    lineHeight: fontSize.body + space.sm,
  },
  bulletText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    lineHeight: fontSize.body + space.sm,
  },
  placeholder: {
    color: color.warning,
    fontWeight: fontWeight.semibold,
  },
});
