import {
  GEAR_KINDS,
  GEAR_MAX_BRAND,
  GEAR_MAX_LIMIT_M,
  GEAR_MAX_MODEL,
  GEAR_MAX_NAME,
  GEAR_MAX_NOTE,
  GEAR_MIN_LIMIT_M,
  type Gear,
  type GearKind,
  type GearRequest,
  type RunActivity,
} from "@shaperoute/shared-types";
import { type ReactNode, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { accountProblem, sessionEnded } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import {
  addGear,
  gearPhotoSource,
  removeGearPhoto,
  saveGear,
  saveGearPhoto,
  deleteGear,
} from "../api/gear";
import { t } from "../i18n";
import { pickDrawingPhoto } from "../social/pickDrawingPhoto";
import { FilterChip } from "../search/FilterChip";
import { runActivityOf, SPORTS } from "../settings/sport";
import { SPORT_PROFILES } from "../sports";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { inUnits, metresPer } from "../units/format";
import { useUnits } from "../units/useUnits";
import { GEAR_LOOKS, lookOf } from "./gearKinds";
import type { GearApi } from "./GearSetting";

type Props = {
  visible: boolean;
  /** The item to change; null for a new one. */
  item: Gear | null;
  onClose: () => void;
  onSaved: () => void;
  token: string;
  api: GearApi;
  onSessionEnded: () => void;
  /** The photo picker; the tests give their own. */
  pick?: typeof pickDrawingPhoto;
};

/** The sports an item can start with: those «Settings» shows ready, in
 * their order, each once (a sport not out yet is not named). */
export const GEAR_SPORTS: readonly RunActivity[] = [
  ...new Set(
    SPORTS.filter((sport) => sport.ready).map((sport) => runActivityOf(sport.id)),
  ),
];

/**
 * An item of gear, new or kept (TASK-486 part B, ADR-0393): its kind, its
 * brand and model, a name of its own, the month it was bought, a note, a
 * photo, the sports it starts with, a limit for what goes far, «Hide from
 * profile» and «Retire». «Save» sends it whole, then the photo.
 */
export function GearEditor({ visible, onClose, ...rest }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {visible && (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Editor onClose={onClose} {...rest} />
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

/** What happens to the photo at «Save». */
type PhotoChange =
  { kind: "kept" } | { kind: "new"; base64: string } | { kind: "removed" };

type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/** A save that failed, in words. */
export function gearProblem(failed: Failed): string {
  if (failed.kind === "api_error") {
    if (failed.code === "comment_rejected") {
      return t("These words can't be used. Try other words.");
    }
    if (failed.code === "invalid_request") {
      return t("Links and special characters can't be used here.");
    }
  }
  return accountProblem(failed);
}

/** "2025-03-14" read as the month and year the fields show. */
function monthYear(day: string | undefined): { month: string; year: string } {
  if (day === undefined) {
    return { month: "", year: "" };
  }
  const [year, month] = day.split("-");
  return { month: String(Number(month)), year };
}

/** The day to send: the one kept when month and year did not change, the
 * first of the month otherwise; undefined when they do not make one. */
export function boughtOn(
  month: string,
  year: string,
  kept: string | undefined,
  today: Date = new Date(),
): string | null | undefined {
  if (month.trim() === "" && year.trim() === "") {
    return null;
  }
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 1950) {
    return undefined;
  }
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  if (first > today.toISOString().slice(0, 10)) {
    return undefined;
  }
  if (kept !== undefined && kept.slice(0, 7) === first.slice(0, 7)) {
    return kept;
  }
  return first;
}

function Editor({
  item,
  onClose,
  onSaved,
  token,
  api,
  onSessionEnded,
  pick = pickDrawingPhoto,
}: Omit<Props, "visible">) {
  const insets = useSafeAreaInsets();
  const units = useUnits();
  const { baseUrl, fetchFn, key } = api;
  const [kind, setKind] = useState<GearKind>(
    item !== null && (GEAR_KINDS as readonly string[]).includes(item.kind)
      ? item.kind
      : "shoes",
  );
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [model, setModel] = useState(item?.model ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [bought, setBought] = useState(monthYear(item?.bought_on));
  const [note, setNote] = useState(item?.note ?? "");
  const [limit, setLimit] = useState(
    item?.limit_m === undefined ? "" : String(Math.round(inUnits(item.limit_m, units))),
  );
  const [offProfile, setOffProfile] = useState(item?.off_profile ?? false);
  const [retired, setRetired] = useState(item?.retired ?? false);
  const [defaults, setDefaults] = useState<RunActivity[]>(item?.defaults ?? []);
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "kept" });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const goesFar = lookOf(kind).measure === "distance";

  const shownPhoto =
    photo.kind === "new"
      ? { uri: `data:image/jpeg;base64,${photo.base64}` }
      : photo.kind === "kept" && item?.photo_url !== undefined && baseUrl !== null
        ? gearPhotoSource(baseUrl, token, item.photo_url, key)
        : null;

  async function choose(source: "library" | "camera") {
    const picked = await pick(source);
    if (picked.kind === "picked") {
      setPhoto({ kind: "new", base64: picked.base64 });
      setProblem(null);
    } else if (picked.kind === "denied") {
      setProblem(
        t(
          "The camera is off for this app. Allow it in Settings, or choose a picture instead.",
        ),
      );
    } else if (picked.kind === "too_large") {
      setProblem(t("This picture is too large. Choose a smaller one."));
    } else if (picked.kind === "pick_failed") {
      setProblem(t("Could not open the picture. Try again."));
    }
  }

  function request(): GearRequest | string {
    if (brand.trim() === "") {
      return t("Say the brand.");
    }
    const day = boughtOn(bought.month, bought.year, item?.bought_on);
    if (day === undefined) {
      return t("Write the month (1 to 12) and the year it was bought.");
    }
    let limitM: number | null = null;
    if (goesFar && limit.trim() !== "") {
      const value = Number(limit.replace(",", "."));
      limitM = Math.round(value * metresPer(units));
      if (
        !Number.isFinite(value) ||
        limitM < GEAR_MIN_LIMIT_M ||
        limitM > GEAR_MAX_LIMIT_M
      ) {
        return t("Write the limit as a number of {unit}.", { unit: units });
      }
    }
    return {
      kind,
      brand: brand.trim(),
      model: model.trim() || null,
      name: name.trim() || null,
      bought_on: day,
      note: note.trim() || null,
      limit_m: limitM,
      off_profile: offProfile,
      retired,
      defaults,
    };
  }

  function failed(outcome: Failed) {
    if (sessionEnded(outcome)) {
      onSessionEnded();
      return;
    }
    setProblem(gearProblem(outcome));
  }

  async function save() {
    if (baseUrl === null || busy) {
      return;
    }
    const asked = request();
    if (typeof asked === "string") {
      setProblem(asked);
      return;
    }
    setBusy(true);
    setProblem(null);
    const options = { fetchFn, key };
    const kept =
      item === null
        ? await addGear(baseUrl, token, asked, options)
        : await saveGear(baseUrl, token, item.id, asked, options);
    if (kept.kind !== "ok") {
      setBusy(false);
      failed(kept);
      return;
    }
    const id = kept.value.id;
    const photoDone =
      photo.kind === "new"
        ? await saveGearPhoto(baseUrl, token, id, photo.base64, options)
        : photo.kind === "removed" && item?.photo_url !== undefined
          ? await removeGearPhoto(baseUrl, token, id, options)
          : null;
    setBusy(false);
    if (photoDone !== null && photoDone.kind !== "ok") {
      failed(photoDone);
      return;
    }
    onSaved();
  }

  function confirmDelete() {
    if (item === null || baseUrl === null) {
      return;
    }
    Alert.alert(
      t("Delete this gear?"),
      t("Its photo goes too. Your activities stay."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            const outcome = await deleteGear(baseUrl, token, item.id, { fetchFn, key });
            setBusy(false);
            if (outcome.kind === "ok") {
              onSaved();
            } else {
              failed(outcome);
            }
          },
        },
      ],
    );
  }

  const toggle = (sport: RunActivity) =>
    setDefaults((was) =>
      was.includes(sport) ? was.filter((s) => s !== sport) : [...was, sport],
    );

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Tap style={styles.back} onPress={onClose} accessibilityRole="button">
          <Text style={styles.backText}>{t("Cancel")}</Text>
        </Tap>
        <Text style={styles.title} accessibilityRole="header">
          {item === null ? t("Add gear") : t("Gear")}
        </Text>
        <Tap
          style={styles.back}
          onPress={() => void save()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
        >
          <Text style={styles.saveText}>{busy ? t("Saving…") : t("Save")}</Text>
        </Tap>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {problem !== null && (
          <Text style={styles.problem} accessibilityLiveRegion="polite">
            {problem}
          </Text>
        )}
        <Field label={t("Kind")}>
          <View style={styles.chips}>
            {GEAR_KINDS.map((each) => (
              <FilterChip
                key={each}
                label={`${GEAR_LOOKS[each].emoji} ${t(GEAR_LOOKS[each].name)}`}
                selected={kind === each}
                onPress={() => setKind(each)}
              />
            ))}
          </View>
        </Field>
        <Field label={t("Photo")}>
          <View style={styles.photoRow}>
            {shownPhoto !== null ? (
              <Image
                style={styles.photo}
                source={shownPhoto}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.photo}>
                <Text style={styles.emoji}>{lookOf(kind).emoji}</Text>
              </View>
            )}
            <View style={styles.photoChoices}>
              <Button
                text={t("Choose a picture")}
                onPress={() => void choose("library")}
              />
              <Button text={t("Take a photo")} onPress={() => void choose("camera")} />
              {shownPhoto !== null && (
                <Button
                  text={t("Remove picture")}
                  onPress={() => setPhoto({ kind: "removed" })}
                />
              )}
            </View>
          </View>
        </Field>
        <Field label={t("Brand")}>
          <Input
            value={brand}
            onChangeText={setBrand}
            maxLength={GEAR_MAX_BRAND}
            accessibilityLabel={t("Brand")}
            placeholder="Nike"
          />
        </Field>
        <Field label={t("Model")}>
          <Input
            value={model}
            onChangeText={setModel}
            maxLength={GEAR_MAX_MODEL}
            accessibilityLabel={t("Model")}
            placeholder="Pegasus 41"
          />
        </Field>
        <Field label={t("Your name for it")}>
          <Input
            value={name}
            onChangeText={setName}
            maxLength={GEAR_MAX_NAME}
            accessibilityLabel={t("Your name for it")}
          />
        </Field>
        <Field label={t("Bought")}>
          <View style={styles.pair}>
            <Input
              style={styles.short}
              value={bought.month}
              onChangeText={(month) => setBought((was) => ({ ...was, month }))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder={t("Month")}
              accessibilityLabel={t("Month bought")}
            />
            <Input
              style={styles.short}
              value={bought.year}
              onChangeText={(year) => setBought((was) => ({ ...was, year }))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder={t("Year")}
              accessibilityLabel={t("Year bought")}
            />
          </View>
        </Field>
        <Field label={t("Note")}>
          <Input
            style={styles.note}
            value={note}
            onChangeText={setNote}
            maxLength={GEAR_MAX_NOTE}
            multiline
            accessibilityLabel={t("Note")}
            placeholder={t("Where you bought it, a race you ran in it…")}
          />
        </Field>
        {goesFar && (
          <Field label={t("Limit")}>
            <View style={styles.pair}>
              <Input
                style={styles.short}
                value={limit}
                onChangeText={setLimit}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel={t("Limit")}
                placeholder="700"
              />
              <Text style={styles.unit}>{units}</Text>
            </View>
            <Text style={styles.hint}>{t("MuW tells you when it passes this.")}</Text>
          </Field>
        )}
        <Field label={t("Use by default for")}>
          <View style={styles.chips}>
            {GEAR_SPORTS.map((sport) => {
              const profile = SPORT_PROFILES.find((each) => each.activity === sport);
              return (
                <FilterChip
                  key={sport}
                  label={`${profile?.emoji ?? ""} ${t(profile?.name ?? sport)}`}
                  selected={defaults.includes(sport)}
                  onPress={() => toggle(sport)}
                />
              );
            })}
          </View>
          <Text style={styles.hint}>
            {t("Activities of these sports start with it chosen.")}
          </Text>
        </Field>
        <Switch
          label={t("Hide from profile")}
          hint={t("Others don't see it. Its kilometres still count.")}
          on={offProfile}
          onChange={setOffProfile}
        />
        {item !== null && (
          <Switch
            label={t("Retire")}
            hint={t("Out of your choices, with its kilometres kept.")}
            on={retired}
            onChange={setRetired}
          />
        )}
        {item !== null && (
          <Tap style={styles.delete} onPress={confirmDelete} accessibilityRole="button">
            <Text style={styles.deleteText}>{t("Delete")}</Text>
          </Tap>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Input({ style, ...input }: TextInputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={color.textFaint}
      keyboardAppearance="dark"
      {...input}
    />
  );
}

function Button({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Tap style={styles.button} onPress={onPress} accessibilityRole="button">
      <Text style={styles.buttonText}>{text}</Text>
    </Tap>
  );
}

function Switch({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <View style={styles.field}>
      <Pressable
        style={styles.switchRow}
        onPress={() => onChange(!on)}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ checked: on }}
      >
        <Text style={styles.switchText}>{label}</Text>
        <View style={[styles.track, on && styles.trackOn]}>
          <View style={[styles.knob, on && styles.knobOn]} />
        </View>
      </Pressable>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const PHOTO_SIDE = 96;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  header: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.md,
    gap: space.md,
  },
  back: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  backText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  saveText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  title: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  content: {
    gap: space.lg,
    padding: space.md,
  },
  field: {
    gap: space.xs,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  photoRow: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "center",
  },
  photo: {
    width: PHOTO_SIDE,
    height: PHOTO_SIDE,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
  },
  emoji: {
    fontSize: fontSize.input * 2,
  },
  photoChoices: {
    flex: 1,
    gap: space.sm,
  },
  // Neutral: the yellow belongs to the route (docs/UI.md, «Il tema»).
  button: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: fontSize.input,
  },
  pair: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  short: {
    minWidth: 96,
  },
  note: {
    minHeight: MIN_TAP_SIZE * 2,
    textAlignVertical: "top",
  },
  unit: {
    color: color.textMuted,
    fontSize: fontSize.input,
  },
  hint: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  switchRow: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  switchText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
  },
  // As the switch of «Links to my posts» (`../settings/PostLinksSetting`).
  track: {
    width: 40,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  trackOn: {
    backgroundColor: color.text,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: color.textMuted,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: color.background,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  delete: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.lg,
  },
  deleteText: {
    color: color.error,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
