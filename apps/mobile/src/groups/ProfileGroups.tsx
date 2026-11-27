import type { MyGroups } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { GroupCard } from "./GroupCard";
import {
  openGroupPage,
  openNewGroupForm,
  useAskedGroup,
  useAskedGroupForm,
} from "./groupDoor";
import { fetchMyGroups } from "./groupsApi";

type Props = {
  apiUrl: string;
  token: string;
  onSessionEnded: (token: string) => void;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * «Groups» on one's own profile (TASK-495 part B, GRUPPI.md §7), seen only
 * by oneself: one's groups by name, the invites waiting, and «New group».
 * Read again when a group's page or the form closes. Nothing at all from an
 * API of before (404).
 */
export function ProfileGroups({
  apiUrl,
  token,
  onSessionEnded,
  fetchFn,
  apiKey,
}: Props) {
  const page = useAskedGroup();
  const form = useAskedGroupForm();
  // Read again once the page and the form are down: joined, left, created.
  const quiet = page === null && form === null;
  // One's groups, asked with one token.
  const [answer, setAnswer] = useState<{ token: string; mine: MyGroups } | null>(null);

  useEffect(() => {
    if (!quiet) {
      return;
    }
    let live = true;
    void fetchMyGroups(apiUrl, token, { fetchFn, key: apiKey }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        setAnswer({ token, mine: outcome.value });
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
    });
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, fetchFn, onSessionEnded, quiet, token]);

  const mine = answer?.token === token ? answer.mine : null;
  if (mine === null) {
    return null;
  }
  return (
    <View style={styles.section} testID="profile-groups">
      <Text style={styles.heading} accessibilityRole="header">
        {t("Groups")}
      </Text>
      {mine.groups.length === 0 && mine.invites.length === 0 && (
        <Text style={styles.empty}>
          {t("Go out together: make a group, or join one.")}
        </Text>
      )}
      {mine.groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          onOpen={() => openGroupPage(group.id)}
        />
      ))}
      {mine.invites.length > 0 && (
        <>
          <Text style={styles.subheading}>{t("Invites")}</Text>
          {mine.invites.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onOpen={() => openGroupPage(group.id)}
            />
          ))}
        </>
      )}
      <Tap
        style={styles.button}
        onPress={openNewGroupForm}
        accessibilityRole="button"
        testID="profile-new-group"
      >
        <Text style={styles.buttonText}>{t("New group")}</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.sm,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  subheading: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    marginTop: space.sm,
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
    paddingHorizontal: space.md,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
