import type {
  GroupDetail,
  GroupOuting,
  GroupOutingDetail,
} from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { sessionEnded } from "../account/messages";
import {
  type Favorite,
  type FavoriteDetail,
  favoriteActivity,
  fetchFavorite,
  fetchFavorites,
} from "../api/favorites";
import {
  favoriteHeading,
  favoritePlace,
  type Keepable,
} from "../favorites/favoriteRoute";
import { type FormMode, GroupRunForm, outingSports } from "../groupRuns/GroupRunForm";
import { GroupRunTile } from "../groupRuns/GroupRunsRow";
import { openGroupRunPage } from "../groupRuns/groupRunDoor";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";

/**
 * The outings on a group's page (TASK-495 part C2, docs/GRUPPI.md §5–§6):
 * «Next outings» and «Past outings» as the cards of the Feed's row, two by
 * two, and «New outing» for its members (the user's choice Q1 of
 * 2026-11-27): «With a route» from one of the Favorites, «Without a route»
 * with the meeting point on the map.
 */

/** The route of a favorite, as the heart keeps it, for a group run. */
export function keepableOfFavorite(detail: FavoriteDetail): Keepable {
  const activity = favoriteActivity(detail);
  return {
    id: detail.id,
    request: {
      city: detail.city,
      shape: detail.shape,
      word: detail.word,
      style: detail.style === "round" || detail.style === "block" ? detail.style : null,
      title: detail.title,
      distance_m: detail.distance_m,
      route_m: detail.route_m,
      similarity: detail.similarity,
      points: detail.points,
      ...(detail.walks !== undefined && detail.walks.length > 0
        ? { walks: detail.walks }
        : {}),
      ...(activity === "running" ? {} : { activity }),
      ...(detail.on_foot !== undefined && detail.on_foot.length > 0
        ? { on_foot: detail.on_foot }
        : {}),
      ...(detail.rotation_deg != null ? { rotation_deg: detail.rotation_deg } : {}),
    },
  };
}

/** The outings as cards, two by two in `width`; «No outings yet.» without. */
export function GroupOutingsGrid({
  runs,
  width,
}: {
  runs: readonly GroupOuting[];
  width: number;
}) {
  if (runs.length === 0) {
    return <Text style={styles.empty}>{t("No outings yet.")}</Text>;
  }
  const card = Math.floor((width - space.sm) / 2);
  return (
    <View style={styles.grid}>
      {runs.map((run) => (
        <GroupRunTile key={run.id} run={run} width={card} />
      ))}
    </View>
  );
}

type Props = {
  group: GroupDetail;
  /** An outing published: the page reads its outings again. */
  onPublished: () => void;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * «New outing», for the members: with a route, one of the Favorites; without
 * one, when the group has a sport recorded outdoors. Published, the outing's
 * page opens over the group's.
 */
export function NewOutingButton({ group, onPublished, fetchFn, apiKey }: Props) {
  const [form, setForm] = useState<FormMode | null>(null);
  const [choosing, setChoosing] = useState(false);
  const free = outingSports(group).length > 0;

  function ask() {
    Alert.alert(t("New outing"), undefined, [
      { text: t("With a route"), onPress: () => setChoosing(true) },
      ...(free
        ? [
            {
              text: t("Without a route"),
              onPress: () => setForm({ kind: "outing", group }),
            },
          ]
        : []),
      { text: t("Not now"), style: "cancel" as const },
    ]);
  }

  return (
    <>
      <Tap
        style={styles.button}
        onPress={ask}
        accessibilityRole="button"
        testID="group-new-outing"
      >
        <Text style={styles.buttonText}>{t("New outing")}</Text>
      </Tap>
      {choosing && (
        <FavoritePicker
          onClose={() => setChoosing(false)}
          onChosen={(route) => {
            setChoosing(false);
            setForm({ kind: "new", route, group });
          }}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
      {form !== null && (
        <GroupRunForm
          mode={form}
          onClose={() => setForm(null)}
          onDone={(run: GroupOutingDetail) => {
            setForm(null);
            onPublished();
            openGroupRunPage(run.id);
          }}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
    </>
  );
}

type Listed =
  | { kind: "loading" }
  | { kind: "failed"; problem: string }
  | { kind: "ready"; favorites: Favorite[] };

/** The Favorites to choose the route of an outing from, the newest first. */
function FavoritePicker({
  onClose,
  onChosen,
  fetchFn,
  apiKey,
}: {
  onClose: () => void;
  onChosen: (route: Keepable) => void;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
}) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Picker
          onClose={onClose}
          onChosen={onChosen}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

function Picker({
  onClose,
  onChosen,
  fetchFn,
  apiKey,
}: {
  onClose: () => void;
  onChosen: (route: Keepable) => void;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [listed, setListed] = useState<Listed>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchFavorites(apiUrl, token, { fetchFn, key: apiKey }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        setListed({ kind: "ready", favorites: outcome.value });
        return;
      }
      if (sessionEnded(outcome)) {
        account.sessionEnded(token);
      }
      setListed({ kind: "failed", problem: t("Your favorites could not load.") });
    });
    return () => {
      live = false;
    };
  }, [account, apiKey, apiUrl, fetchFn, token]);

  async function choose(favorite: Favorite) {
    if (apiUrl === null || token === null) {
      return;
    }
    setBusy(favorite.id);
    setProblem(null);
    const outcome = await fetchFavorite(apiUrl, token, favorite.id, {
      fetchFn,
      key: apiKey,
    });
    setBusy(null);
    if (outcome.kind === "ok") {
      onChosen(keepableOfFavorite(outcome.value));
      return;
    }
    setProblem(t("Something went wrong."));
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md },
      ]}
      testID="outing-favorites"
    >
      <Text style={styles.title} accessibilityRole="header">
        {t("Choose a favorite")}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        {listed.kind === "loading" && <ActivityIndicator color={color.textMuted} />}
        {listed.kind === "failed" && (
          <Text style={styles.problem} accessibilityRole="alert">
            {listed.problem}
          </Text>
        )}
        {listed.kind === "ready" && listed.favorites.length === 0 && (
          <Text style={styles.empty}>{t("No favorites yet")}</Text>
        )}
        {listed.kind === "ready" &&
          listed.favorites.map((favorite) => {
            const place = favoritePlace(favorite);
            return (
              <Tap
                key={favorite.id}
                style={styles.row}
                onPress={() => void choose(favorite)}
                disabled={busy !== null}
                accessibilityRole="button"
                testID={`outing-favorite-${favorite.id}`}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {favoriteHeading(favorite)}
                </Text>
                {place !== null && (
                  <Text style={styles.rowFacts} numberOfLines={1}>
                    {place}
                  </Text>
                )}
              </Tap>
            );
          })}
        {problem !== null && (
          <Text style={styles.problem} accessibilityRole="alert">
            {problem}
          </Text>
        )}
      </ScrollView>
      <Tap style={styles.button} onPress={onClose} accessibilityRole="button">
        <Text style={styles.buttonText}>{t("Not now")}</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  screen: {
    flex: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  list: {
    gap: space.sm,
  },
  row: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  rowTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  rowFacts: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
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
