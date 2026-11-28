import type { Group, LatLon, RunActivity } from "@shaperoute/shared-types";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { loadSession } from "../account/sessionStore";
import { t } from "../i18n";
import { useTabBarRoom } from "../tabs/tabBarRoom";
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
import { sportChoices } from "./GroupForm";
import { GroupSubPage } from "./GroupSubPage";
import { openGroupPage } from "./groupDoor";
import { findGroups, GROUP_QUERY_MIN, type GroupsWanted } from "./groupsApi";

/** The share of the page's width a card of the row takes: the next peeks. */
const CARD_SHARE = 0.8;
/** How long the search waits for the typing to stop. */
const TYPING_MS = 300;

type Common = {
  apiUrl: string | null;
  /** The token of the account on this phone; null signed out. */
  readToken?: () => string | null;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
};

function sessionToken(): string | null {
  return loadSession()?.token ?? null;
}

type Found =
  { key: string; status: "done"; groups: Group[] } | { key: string; status: "failed" };

/** The groups a search wants, asked again when what it wants changes. */
function useFoundGroups(
  apiUrl: string | null,
  token: string | null,
  wanted: GroupsWanted | null,
  fetchFn: typeof fetch | undefined,
): Found | null {
  const key =
    apiUrl === null || token === null || wanted === null
      ? null
      : `${apiUrl} ${JSON.stringify(wanted)}`;
  const [found, setFound] = useState<Found | null>(null);

  useEffect(() => {
    if (key === null || apiUrl === null || token === null || wanted === null) {
      return;
    }
    let live = true;
    void findGroups(apiUrl, token, wanted, { fetchFn }).then((outcome) => {
      if (live) {
        setFound(
          outcome.kind === "ok"
            ? { key, status: "done", groups: outcome.value.groups }
            : { key, status: "failed" },
        );
      }
    });
    return () => {
      live = false;
    };
    // `wanted` is in the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, apiUrl, token, fetchFn]);

  return found !== null && found.key === key ? found : null;
}

/**
 * «Groups near you» at the very end of «Explore» (TASK-495 part D, the
 * user's choice of 2026-11-27, GRUPPI.md §7): the Public and Request groups
 * within 50 km of the start, the nearest first, in a row that scrolls;
 * «See all» opens the search. Nothing at all signed out, or from an API of
 * before; without a start, only «See all».
 */
export function ExploreGroups({
  apiUrl,
  near,
  width,
  onSeeAll,
  readToken = sessionToken,
  fetchFn,
}: Common & {
  /** The start of «Explore»: the groups are the ones near it. */
  near: LatLon | null;
  /** How wide the page is between its margins. */
  width: number;
  onSeeAll: () => void;
}) {
  const lat = near?.[0];
  const lon = near?.[1];
  // Read once for each start, from the keychain, as «Recommended».
  const token = useMemo(
    () => (apiUrl === null ? null : readToken()),
    // A new start reads it again: signed in since, the row is there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiUrl, readToken, lat, lon],
  );
  const wanted = useMemo<GroupsWanted | null>(
    () => (lat === undefined || lon === undefined ? null : { near: [lat, lon] }),
    [lat, lon],
  );
  const found = useFoundGroups(apiUrl, token, wanted, fetchFn);

  if (apiUrl === null || token === null || found?.status === "failed") {
    return null;
  }
  const cardWidth = Math.round(width * CARD_SHARE);
  return (
    <View style={styles.section} testID="explore-groups">
      <View style={styles.heading}>
        <Text style={styles.label} accessibilityRole="header">
          {t("GROUPS NEAR YOU")}
        </Text>
        <Tap
          style={styles.seeAll}
          onPress={onSeeAll}
          accessibilityRole="button"
          testID="explore-groups-all"
        >
          <Text style={styles.seeAllText}>{t("See all@@groups")}</Text>
        </Tap>
      </View>
      {found?.status === "done" && found.groups.length === 0 && (
        <Text style={styles.note}>{t("No groups near you yet.")}</Text>
      )}
      {found?.status === "done" && found.groups.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            {found.groups.map((group) => (
              <View key={group.id} style={{ width: cardWidth }}>
                <GroupCard group={group} onOpen={() => openGroupPage(group.id)} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/**
 * The search of groups behind «See all» (TASK-495 part D, GRUPPI.md §7):
 * a part of a name, anywhere, or else the groups near the start; a sport
 * chosen narrows both. A group touched opens its page over it.
 */
export function GroupSearch({
  apiUrl,
  near,
  onBack,
  readToken = sessionToken,
  fetchFn,
}: Common & {
  near: LatLon | null;
  onBack: () => void;
}) {
  const barRoom = useTabBarRoom();
  const token = useMemo(
    () => (apiUrl === null ? null : readToken()),
    [apiUrl, readToken],
  );
  const choices = useMemo(() => sportChoices(), []);
  const [typed, setTyped] = useState("");
  const [sport, setSport] = useState<RunActivity | null>(null);
  // The name asked for once the typing stops.
  const [name, setName] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setName(typed.trim()), TYPING_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const lat = near?.[0];
  const lon = near?.[1];
  const byName = name.length >= GROUP_QUERY_MIN;
  const wanted = useMemo<GroupsWanted | null>(
    () =>
      byName
        ? { q: name, sport }
        : lat === undefined || lon === undefined
          ? null
          : { near: [lat, lon], sport },
    [byName, name, sport, lat, lon],
  );
  const found = useFoundGroups(apiUrl, token, wanted, fetchFn);

  return (
    <GroupSubPage title={t("Groups")} onBack={onBack} testID="group-search">
      <TextInput
        style={styles.input}
        value={typed}
        onChangeText={setTyped}
        placeholder={t("Search by name")}
        placeholderTextColor={color.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={t("Search by name")}
        testID="group-search-name"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.row}>
          {choices.map((choice) => {
            const chosen = sport === choice.activity;
            return (
              <Tap
                key={choice.activity}
                style={[styles.chip, chosen && styles.chosen]}
                onPress={() => setSport(chosen ? null : choice.activity)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: chosen }}
                testID={`group-search-sport-${choice.activity}`}
              >
                <Text style={[styles.chipText, chosen && styles.chosenText]}>
                  {choice.emoji} {t(choice.name)}
                </Text>
              </Tap>
            );
          })}
        </View>
      </ScrollView>
      {wanted === null && (
        <Text style={styles.note}>
          {t("Write at least {count} letters of a group's name.", {
            count: GROUP_QUERY_MIN,
          })}
        </Text>
      )}
      {found?.status === "failed" && (
        <Text style={styles.note} accessibilityRole="alert">
          {t("The groups could not load. Check the connection and try again.")}
        </Text>
      )}
      {found?.status === "done" && found.groups.length === 0 && (
        <Text style={styles.note}>
          {byName ? t("No group found.") : t("No groups near you yet.")}
        </Text>
      )}
      {found?.status === "done" &&
        found.groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onOpen={() => openGroupPage(group.id)}
          />
        ))}
      {/* The page goes on under the tab bar: its room at the end. */}
      <View style={{ height: barRoom }} />
    </GroupSubPage>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.sm,
    marginTop: space.lg,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  // As «RECOMMENDED» and «NEAR YOU».
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  seeAll: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  seeAllText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  row: {
    flexDirection: "row",
    gap: space.md,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: fontSize.input,
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chosen: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  chosenText: {
    color: color.background,
  },
});
