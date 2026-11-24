import {
  GROUP_CITY_MAX,
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_SPORTS_MAX,
  type GroupAccess,
  type GroupDetail,
  type GroupRequest,
  type LatLon,
  type RunActivity,
} from "@shaperoute/shared-types";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { sessionEnded } from "../account/messages";
import { SAFETY } from "../groupRuns/GroupRunForm";
import { t, tLater } from "../i18n";
import { PlaceSearch } from "../places/PlaceSearch";
import { type PickedPhoto, pickPhoto } from "../profile/pickPhoto";
import { runActivityOf, SPORTS, type SportOption } from "../settings/sport";
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
import { changeGroup, createGroup, putGroupPhoto, removeGroupPhoto } from "./groupsApi";
import {
  ACCESS_TEXTS,
  ALPINISM_SAFETY,
  groupPhotoUri,
  groupProblem,
  knownPoint,
  mayBePublic,
} from "./groupText";

export type GroupFormMode = { kind: "new" } | { kind: "change"; group: GroupDetail };

type Props = {
  mode: GroupFormMode;
  onClose: () => void;
  /** The group created or changed, as the API keeps it. */
  onDone: (group: GroupDetail) => void;
  /** For the tests: where the phone is, the picker, the fake fetch. */
  locate?: () => Promise<LatLon | null>;
  pick?: (source: "library") => Promise<PickedPhoto>;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/** A sport a group can have: the app's sports, each once. */
type SportChoice = { activity: RunActivity; emoji: string; name: string };

/** The sports offered, in the order of «Settings». */
export function sportChoices(sports: readonly SportOption[] = SPORTS): SportChoice[] {
  const seen = new Set<RunActivity>();
  const choices: SportChoice[] = [];
  for (const option of sports) {
    const activity = runActivityOf(option.id);
    if (option.ready && !seen.has(activity)) {
      seen.add(activity);
      choices.push({ activity, emoji: option.emoji, name: option.name });
    }
  }
  return choices;
}

/** A text the API keeps as null when empty. */
function orNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

/** A picture that could not be picked, in words; cancelled says nothing. */
function pickProblem(picked: Exclude<PickedPhoto, { kind: "picked" }>): string | null {
  switch (picked.kind) {
    case "cancelled":
      return null;
    case "too_large":
      return t("This picture is too large. Choose a smaller one.");
    default:
      return t("Could not open the picture. Try again.");
  }
}

/** What happens to the photo once the group is saved. */
type PhotoPlan =
  { kind: "keep" } | { kind: "put"; base64: string } | { kind: "remove" };

const ACCESSES: readonly GroupAccess[] = ["public", "request", "invite"];

/** The words of the city search, in English: shown with `t`. */
const FIND_CITY = tLater("Find your city");

/**
 * «New group» (TASK-495 part B, docs/GRUPPI.md §2): a name, a photo, a
 * description, 1 to 3 of the app's sports, a city with a point (the phone's
 * last place when «Draw» may read it, else a city from the list), and the
 * way in, «Request to join» to begin with. A group with alpinism is never
 * public. The safety words stay above «Create», and the alpinism ones with
 * them. The same form lets the admin change the group.
 */
export function GroupForm(props: Props) {
  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Form {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function Form({
  mode,
  onClose,
  onDone,
  locate = knownPoint,
  pick = pickPhoto,
  fetchFn,
  apiKey,
}: Props) {
  const insets = useSafeAreaInsets();
  const { apiUrl, account } = useFollowsDoor();
  const { state } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const was = mode.kind === "change" ? mode.group : null;
  const choices = useMemo(() => sportChoices(), []);
  const [name, setName] = useState(was?.name ?? "");
  const [description, setDescription] = useState(was?.description ?? "");
  const [sports, setSports] = useState<string[]>(was?.sports ?? []);
  const [city, setCity] = useState(was?.city ?? "");
  const [area, setArea] = useState<LatLon | null>(was?.area ?? null);
  const [located, setLocated] = useState(was !== null);
  const [access, setAccess] = useState<GroupAccess>(was?.access ?? "request");
  const [photo, setPhoto] = useState<PhotoPlan>({ kind: "keep" });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const publicOk = mayBePublic(sports);
  const alpinism = !publicOk;

  // A new group's point: where the phone was last, if «Draw» may know it.
  useEffect(() => {
    if (was !== null) {
      return;
    }
    let live = true;
    void locate().then((point) => {
      if (live) {
        setArea((chosen) => chosen ?? point);
        setLocated(true);
      }
    });
    return () => {
      live = false;
    };
  }, [locate, was]);

  const ready =
    name.trim() !== "" &&
    sports.length > 0 &&
    city.trim() !== "" &&
    area !== null &&
    !busy &&
    apiUrl !== null &&
    token !== null;

  function toggle(activity: string) {
    const next = sports.includes(activity)
      ? sports.filter((one) => one !== activity)
      : sports.length < GROUP_SPORTS_MAX
        ? [...sports, activity]
        : sports;
    setSports(next);
    // Alpinism asks to join at least: «Public» goes.
    if (!mayBePublic(next) && access === "public") {
      setAccess("request");
    }
  }

  async function choosePhoto() {
    setProblem(null);
    const picked = await pick("library");
    if (picked.kind === "picked") {
      setPhoto({ kind: "put", base64: picked.base64 });
    } else {
      setProblem(pickProblem(picked));
    }
  }

  async function save() {
    if (apiUrl === null || token === null || area === null) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const body: GroupRequest = {
      name: name.trim(),
      description: orNull(description),
      sports: sports as RunActivity[],
      city: city.trim(),
      area,
      access,
    };
    const options = { fetchFn, key: apiKey };
    const outcome =
      mode.kind === "new"
        ? await createGroup(apiUrl, token, body, options)
        : await changeGroup(apiUrl, token, mode.group.id, body, options);
    if (outcome.kind !== "ok") {
      setBusy(false);
      if (sessionEnded(outcome)) {
        account.sessionEnded(token);
      }
      setProblem(groupProblem(outcome));
      return;
    }
    let group = outcome.value;
    // The photo after the group: it needs the group's id. A photo refused
    // leaves the group saved: «Edit» can try it again.
    if (photo.kind === "put") {
      const put = await putGroupPhoto(apiUrl, token, group.id, photo.base64, options);
      if (put.kind === "ok") {
        group = put.value;
      }
    } else if (photo.kind === "remove") {
      const removed = await removeGroupPhoto(apiUrl, token, group.id, options);
      if (removed.kind === "ok") {
        group = { ...group, photo: null, big_photo: null };
      }
    }
    setBusy(false);
    onDone(group);
  }

  const shownPhoto =
    photo.kind === "put"
      ? `data:image/jpeg;base64,${photo.base64}`
      : photo.kind === "remove"
        ? null
        : groupPhotoUri(was?.big_photo ?? was?.photo ?? null);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.fields}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title} accessibilityRole="header">
          {mode.kind === "new" ? t("New group") : t("Edit")}
        </Text>
        <Text style={styles.label}>{t("Name")}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={GROUP_NAME_MAX}
          accessibilityLabel={t("Name")}
          testID="group-name"
        />
        <Text style={styles.label}>{t("Photo")}</Text>
        <View style={styles.photoRow}>
          {shownPhoto !== null && (
            <Image
              source={{ uri: shownPhoto }}
              style={styles.photo}
              accessibilityIgnoresInvertColors
              testID="group-form-photo"
            />
          )}
          <Tap
            style={styles.smallButton}
            onPress={() => void choosePhoto()}
            accessibilityRole="button"
            testID="group-choose-photo"
          >
            <Text style={styles.smallButtonText}>{t("Choose photo")}</Text>
          </Tap>
          {shownPhoto !== null && (
            <Tap
              style={styles.smallButton}
              onPress={() =>
                setPhoto(was === null ? { kind: "keep" } : { kind: "remove" })
              }
              accessibilityRole="button"
              testID="group-remove-photo"
            >
              <Text style={styles.smallButtonText}>{t("Remove photo")}</Text>
            </Tap>
          )}
        </View>
        <Text style={styles.label}>{t("Description")}</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          value={description}
          onChangeText={setDescription}
          maxLength={GROUP_DESCRIPTION_MAX}
          multiline
          accessibilityLabel={t("Description")}
          testID="group-description"
        />
        <Text style={styles.label}>
          {t("Sports (up to {count})", { count: GROUP_SPORTS_MAX })}
        </Text>
        <View style={styles.wrap}>
          {choices.map((choice) => {
            const chosen = sports.includes(choice.activity);
            const off = !chosen && sports.length >= GROUP_SPORTS_MAX;
            return (
              <Tap
                key={choice.activity}
                style={[styles.chip, chosen && styles.chosen, off && styles.off]}
                onPress={() => toggle(choice.activity)}
                disabled={off}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: chosen, disabled: off }}
                testID={`group-sport-${choice.activity}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    chosen && styles.chosenText,
                    off && styles.off,
                  ]}
                >
                  {choice.emoji} {t(choice.name)}
                </Text>
              </Tap>
            );
          })}
        </View>
        <Text style={styles.label}>{t("City")}</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          maxLength={GROUP_CITY_MAX}
          accessibilityLabel={t("City")}
          testID="group-city"
        />
        {located && area === null && (
          <PlaceSearch
            placeholder={FIND_CITY}
            onSelect={(place) => {
              setArea(place.point);
              setCity((typed) =>
                typed.trim() === "" ? place.label.slice(0, GROUP_CITY_MAX) : typed,
              );
            }}
          />
        )}
        <Text style={styles.label}>{t("Who can join")}</Text>
        <View style={styles.choices}>
          {ACCESSES.map((one) => {
            const off = one === "public" && !publicOk;
            return (
              <Tap
                key={one}
                style={[
                  styles.choice,
                  access === one && styles.chosen,
                  off && styles.off,
                ]}
                onPress={() => setAccess(one)}
                disabled={off}
                accessibilityRole="radio"
                accessibilityState={{ selected: access === one, disabled: off }}
                testID={`group-access-${one}`}
              >
                <Text
                  style={[
                    styles.choiceText,
                    access === one && styles.chosenText,
                    off && styles.off,
                  ]}
                  numberOfLines={1}
                >
                  {t(ACCESS_TEXTS[one])}
                </Text>
              </Tap>
            );
          })}
        </View>
        <Text style={styles.safety}>{t(SAFETY)}</Text>
        {alpinism && <Text style={styles.safety}>{t(ALPINISM_SAFETY)}</Text>}
        {problem !== null && (
          <Text style={styles.problem} accessibilityRole="alert">
            {problem}
          </Text>
        )}
      </ScrollView>
      <View style={styles.buttons}>
        <Tap style={styles.button} onPress={onClose} accessibilityRole="button">
          <Text style={styles.buttonText}>{t("Not now")}</Text>
        </Tap>
        <Tap
          style={[styles.button, styles.primary, !ready && styles.off]}
          onPress={() => void save()}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy }}
          testID="group-save"
        >
          <Text style={[styles.buttonText, styles.primaryText, !ready && styles.off]}>
            {mode.kind === "new" ? t("Create") : t("Save")}
          </Text>
        </Tap>
      </View>
    </View>
  );
}

const PHOTO = 2 * MIN_TAP_SIZE;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  fields: {
    gap: space.md,
    paddingBottom: space.md,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
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
  notes: {
    minHeight: 3 * MIN_TAP_SIZE,
    paddingTop: space.sm,
    textAlignVertical: "top",
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: radius.lg,
  },
  smallButton: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  smallButtonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  choices: {
    flexDirection: "row",
    gap: space.sm,
  },
  choice: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chosen: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  choiceText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  chosenText: {
    color: color.background,
  },
  safety: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
    paddingTop: space.sm,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  primary: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  // On the words as well as on the control: Tap lays its own opacity over
  // the control's style.
  off: {
    opacity: 0.5,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  primaryText: {
    color: color.background,
  },
});
