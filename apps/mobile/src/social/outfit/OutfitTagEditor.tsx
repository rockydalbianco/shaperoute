import {
  OUTFIT_ITEMS,
  type OutfitItem,
  type OutfitTagReason,
} from "@shaperoute/shared-types";
import { useCallback, useMemo, useState } from "react";
import {
  Animated,
  Image,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../../theme/tokens";
import { SheetModal } from "../../ui/SheetModal";
import { useOutfitTagging } from "./OutfitTagging";
import {
  brandReady,
  draftProblem,
  OUTFIT_BRAND_MAX_LENGTH,
  OUTFIT_MODEL_MAX_LENGTH,
  OUTFIT_URL_MAX_LENGTH,
  type OutfitDraft,
  photoFrame,
  pointIn,
  pointOn,
  roomProblem,
} from "./outfitTags";
import { dotLabel, outfitWords } from "./outfitWords";

/** The photos of a post are 4:5 (TASK-348): the box the photo is shown in. */
const BOX_RATIO = 5 / 4;
/** The dot as it is seen; the finger has `MIN_TAP_SIZE` around it. */
const DOT = 18;
/** Moved less than this, a touch on a dot is a tap. */
const TAP_SLOP = 6;
/** At most so many brands suggested under the field. */
const BRANDS_SHOWN = 5;

type Props = {
  /** The photo as it will be published. */
  source: ImageSourcePropType;
  /** Its items, as kept. */
  tags: readonly OutfitDraft[];
  /** The items on the post's other photos: 10 in all at most. */
  elsewhere: number;
  /** The brands tagged before, the latest first. */
  brands: readonly string[];
  /** Why the API refused these items; null when it did not. */
  refused: OutfitTagReason | null;
  /** The sheet is down, with the items as they are now: the one that shows
   * it then takes it away. */
  onDone: (tags: OutfitDraft[]) => void;
};

/** What the form holds while an item is written. */
type Form = { item: OutfitItem; brand: string; model: string; url: string };

const EMPTY: Form = { item: "shoes", brand: "", model: "", url: "" };

function formOf(tag: OutfitDraft): Form {
  return {
    item: tag.item,
    brand: tag.brand,
    model: tag.product_name ?? "",
    url: tag.url ?? "",
  };
}

/**
 * «Tag what you wear» on a photo of the author's post (TASK-394 part B,
 * ADR-0333): the photo whole, a tap where an item is, then what it is, its
 * brand and, if one likes, its model and the shop's link. A dot stays where
 * it was put, is dragged elsewhere, or tapped to change or remove its item.
 * At most 5 on a photo and 10 in a post. Closing the sheet keeps the items
 * as they are; one still being written is not kept.
 */
export function OutfitTagEditor({
  source,
  tags: kept,
  elsewhere,
  brands,
  refused,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screen } = useWindowDimensions();
  const words = outfitWords();
  const [tags, setTags] = useState<OutfitDraft[]>(() => [...kept]);
  // The item being written: one of `tags`, or a new one at `point`.
  const [editing, setEditing] = useState<
    { kind: "new"; x: number; y: number } | { kind: "tag"; index: number } | null
  >(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [problem, setProblem] = useState<OutfitTagReason | null>(refused);
  const [dragging, setDragging] = useState(false);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(
    null,
  );
  const boxWidth = Math.max(screen - space.lg * 2, 1);
  const boxHeight = Math.round(boxWidth * BOX_RATIO);
  const box = { width: boxWidth, height: boxHeight };
  const frame = useMemo(() => {
    const whole = { width: boxWidth, height: boxHeight };
    return photoFrame(whole, natural ?? whole, "contain");
  }, [boxHeight, boxWidth, natural]);

  // Down first, then gone (TASK-388 C3), as the app's other sheets.
  const [open, setOpen] = useState(true);
  const done = () => setOpen(false);

  function place(left: number, top: number) {
    const room = roomProblem(tags.length, elsewhere + tags.length);
    if (room !== null) {
      setProblem(room);
      return;
    }
    setProblem(null);
    setEditing({ kind: "new", ...pointOn(frame, left, top) });
    setForm((was) => ({ ...EMPTY, item: was.item }));
  }

  // The same while a dot is held: the dot keeps the finger.
  const choose = useCallback(
    (index: number) => {
      const tag = tags[index];
      if (tag === undefined) {
        return;
      }
      setProblem(null);
      setEditing({ kind: "tag", index });
      setForm(formOf(tag));
    },
    [tags],
  );

  const move = useCallback(
    (index: number, left: number, top: number) => {
      const point = pointOn(frame, left, top);
      setTags((was) => was.map((tag, i) => (i === index ? { ...tag, ...point } : tag)));
    },
    [frame],
  );

  function add() {
    if (editing === null || !brandReady(form.brand)) {
      return;
    }
    const base =
      editing.kind === "new"
        ? { id: null, x: editing.x, y: editing.y }
        : (tags[editing.index] ?? null);
    if (base === null) {
      return;
    }
    const draft: OutfitDraft = {
      id: base.id,
      x: base.x,
      y: base.y,
      item: form.item,
      brand: form.brand.trim(),
      product_name: form.model.trim() === "" ? null : form.model.trim(),
      url: form.url.trim() === "" ? null : form.url.trim(),
    };
    const wrong = draftProblem(draft);
    if (wrong !== null) {
      setProblem(wrong);
      return;
    }
    setProblem(null);
    setTags((was) =>
      editing.kind === "new"
        ? [...was, draft]
        : was.map((tag, i) => (i === editing.index ? draft : tag)),
    );
    setEditing(null);
  }

  function remove() {
    if (editing?.kind === "tag") {
      const index = editing.index;
      setTags((was) => was.filter((_, i) => i !== index));
    }
    setProblem(null);
    setEditing(null);
  }

  const typed = form.brand.trim().toLowerCase();
  const suggested = brands
    .filter(
      (brand) => brand.toLowerCase() !== typed && brand.toLowerCase().startsWith(typed),
    )
    .slice(0, BRANDS_SHOWN);

  return (
    <SheetModal visible={open} onRequestClose={done} onHidden={() => onDone(tags)}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={[styles.backdrop, { minHeight: insets.top + space.xl }]}
          onPress={done}
          accessible={false}
          importantForAccessibility="no"
          testID="outfit-editor-backdrop"
        />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + space.sm }]}
          testID="outfit-editor"
        >
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {words.tagButton}
            </Text>
            <Pressable
              style={styles.close}
              onPress={done}
              accessibilityRole="button"
              testID="outfit-editor-done"
            >
              <Text style={styles.closeText}>{t("Done")}</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!dragging}
          >
            <Text style={styles.line}>{words.hint}</Text>
            <View style={[styles.box, box]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={({ nativeEvent }) =>
                  place(nativeEvent.locationX, nativeEvent.locationY)
                }
                accessibilityRole="button"
                accessibilityLabel={words.hint}
                testID="outfit-photo"
              >
                <Image
                  source={source}
                  style={StyleSheet.absoluteFill}
                  resizeMode="contain"
                  onLoad={({ nativeEvent }) => {
                    const { width, height } = nativeEvent.source;
                    if (width > 0 && height > 0) {
                      setNatural({ width, height });
                    }
                  }}
                  accessible={false}
                />
              </Pressable>
              {tags.map((tag, index) => (
                <Dot
                  key={`${tag.id ?? "new"}-${index}`}
                  index={index}
                  {...pointIn(frame, tag.x, tag.y)}
                  on={editing?.kind === "tag" && editing.index === index}
                  label={dotLabel(tag.item, tag.brand)}
                  onTap={choose}
                  onMove={move}
                  onDragging={setDragging}
                  testID={`outfit-dot-${index}`}
                />
              ))}
              {editing?.kind === "new" && (
                <View
                  style={[styles.dotTap, at(pointIn(frame, editing.x, editing.y))]}
                  pointerEvents="none"
                  testID="outfit-dot-new"
                >
                  <View style={[styles.dot, styles.dotOn]} />
                </View>
              )}
            </View>
            {problem !== null && (
              <Text
                style={styles.problem}
                accessibilityRole="alert"
                testID="outfit-problem"
              >
                {words.problems[problem]}
              </Text>
            )}
            {editing !== null && (
              <View style={styles.form} testID="outfit-form">
                <Text style={styles.label}>{words.item}</Text>
                <View style={styles.chips} accessibilityRole="radiogroup">
                  {OUTFIT_ITEMS.map((item) => {
                    const on = form.item === item;
                    return (
                      <Pressable
                        key={item}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => setForm((was) => ({ ...was, item }))}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>
                          {words.items[item]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.label}>{words.brand}</Text>
                <TextInput
                  style={styles.input}
                  value={form.brand}
                  onChangeText={(brand) => setForm((was) => ({ ...was, brand }))}
                  maxLength={OUTFIT_BRAND_MAX_LENGTH}
                  autoCorrect={false}
                  accessibilityLabel={words.brand}
                  testID="outfit-brand"
                />
                {suggested.length > 0 && (
                  <View style={styles.chips}>
                    {suggested.map((brand) => (
                      <Pressable
                        key={brand}
                        style={styles.chip}
                        onPress={() => setForm((was) => ({ ...was, brand }))}
                        accessibilityRole="button"
                      >
                        <Text style={styles.chipText}>{brand}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <Text style={styles.label}>{words.model}</Text>
                <TextInput
                  style={styles.input}
                  value={form.model}
                  onChangeText={(model) => setForm((was) => ({ ...was, model }))}
                  maxLength={OUTFIT_MODEL_MAX_LENGTH}
                  accessibilityLabel={words.model}
                  testID="outfit-model"
                />
                <Text style={styles.label}>{words.link}</Text>
                <TextInput
                  style={styles.input}
                  value={form.url}
                  onChangeText={(url) => setForm((was) => ({ ...was, url }))}
                  maxLength={OUTFIT_URL_MAX_LENGTH}
                  placeholder="https://"
                  placeholderTextColor={color.textFaint}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={words.link}
                  testID="outfit-url"
                />
                <View style={styles.buttons}>
                  <Pressable
                    style={[styles.button, !brandReady(form.brand) && styles.busy]}
                    onPress={add}
                    disabled={!brandReady(form.brand)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !brandReady(form.brand) }}
                    testID="outfit-add"
                  >
                    <Text style={styles.buttonText}>
                      {editing.kind === "new" ? words.add : t("Save")}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.button}
                    onPress={remove}
                    accessibilityRole="button"
                    testID="outfit-remove"
                  >
                    <Text style={styles.buttonText}>{words.remove}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SheetModal>
  );
}

/**
 * «Tag what you wear» under the photo chosen in the composer (TASK-348), and
 * its form: only where the screen hands down the items (`OutfitTagging`),
 * on the author's own photos.
 */
export function TagWhatYouWear({
  n,
  source,
  places,
  disabled,
}: {
  /** The photo's place. */
  n: number;
  source: ImageSourcePropType;
  /** The places of all the post's photos. */
  places: readonly number[];
  disabled?: boolean;
}) {
  const outfit = useOutfitTagging();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  if (outfit === null) {
    return null;
  }
  const words = outfitWords();
  const tags = outfit.tagsOf(n);
  const elsewhere = places
    .filter((place) => place !== n)
    .reduce((sum, place) => sum + outfit.tagsOf(place).length, 0);
  const refused = outfit.refusedOf(n);
  return (
    <View style={styles.wear}>
      <View style={styles.chips}>
        <Pressable
          style={[
            styles.chip,
            tags.length > 0 && styles.chipOn,
            disabled && styles.busy,
          ]}
          onPress={() => {
            setFailed(false);
            setOpen(true);
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          testID="outfit-open"
        >
          <Text style={[styles.chipText, tags.length > 0 && styles.chipTextOn]}>
            {words.tagButton}
          </Text>
        </Pressable>
      </View>
      {refused !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {words.problems[refused]}
        </Text>
      )}
      {failed && (
        <Text style={styles.problem} accessibilityRole="alert">
          {t("This photo could not be kept on the phone. Try again.")}
        </Text>
      )}
      {open && (
        <OutfitTagEditor
          source={source}
          tags={tags}
          elsewhere={elsewhere}
          brands={outfit.brands}
          refused={refused}
          onDone={(next) => {
            setOpen(false);
            // Kept again only when changed: a list kept goes to the API.
            if (JSON.stringify(next) !== JSON.stringify(tags)) {
              setFailed(!outfit.setTags(n, next));
            }
          }}
        />
      )}
    </View>
  );
}

function at(point: { left: number; top: number }) {
  return { left: point.left - MIN_TAP_SIZE / 2, top: point.top - MIN_TAP_SIZE / 2 };
}

/** A dot of the form: tapped, its item opens; held and moved, it follows
 * the finger and stays where it is let go. */
function Dot({
  index,
  left,
  top,
  on,
  label,
  onTap,
  onMove,
  onDragging,
  testID,
}: {
  index: number;
  left: number;
  top: number;
  on: boolean;
  label: string;
  onTap: (index: number) => void;
  onMove: (index: number, left: number, top: number) => void;
  onDragging: (dragging: boolean) => void;
  testID: string;
}) {
  // How far the finger took it: the dot moves there, and stays at the end.
  const [offset] = useState(() => new Animated.ValueXY());
  const responder = useMemo(() => {
    const back = () => {
      offset.setValue({ x: 0, y: 0 });
      onDragging(false);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => onDragging(true),
      onPanResponderMove: (_, gesture) =>
        offset.setValue({ x: gesture.dx, y: gesture.dy }),
      onPanResponderRelease: (_, gesture) => {
        back();
        if (Math.abs(gesture.dx) <= TAP_SLOP && Math.abs(gesture.dy) <= TAP_SLOP) {
          onTap(index);
        } else {
          onMove(index, left + gesture.dx, top + gesture.dy);
        }
      },
      onPanResponderTerminate: back,
    });
  }, [index, left, offset, onDragging, onMove, onTap, top]);
  return (
    <Animated.View
      style={[
        styles.dotTap,
        at({ left, top }),
        { transform: offset.getTranslateTransform() },
      ]}
      {...responder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onAccessibilityTap={() => onTap(index)}
      testID={testID}
    >
      <View style={[styles.dot, on && styles.dotOn]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    flexGrow: 1,
  },
  sheet: {
    flexShrink: 1,
    maxHeight: "92%",
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.sm,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  close: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  closeText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  scroll: {
    flexShrink: 1,
  },
  line: {
    color: color.textMuted,
    fontSize: fontSize.small,
    marginBottom: space.sm,
  },
  box: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: color.surfaceRaised,
  },
  dotTap: {
    position: "absolute",
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  // White with a dark edge, as Style's: seen on any photo, light or dark.
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: color.scrim,
    backgroundColor: color.onScrim,
  },
  // The one being written: larger, with the accent at its heart.
  dotOn: {
    width: DOT + 6,
    height: DOT + 6,
    borderRadius: (DOT + 6) / 2,
    backgroundColor: color.accent,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
    marginTop: space.sm,
  },
  form: {
    gap: space.xs,
    marginTop: space.md,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    marginTop: space.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
  },
  chip: {
    minHeight: MIN_TAP_SIZE - space.sm,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chipOn: {
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  chipText: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  chipTextOn: {
    color: color.text,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: fontSize.input,
    color: color.text,
    backgroundColor: color.surface,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.sm,
  },
  // Neutral, as every control but the one that draws the route.
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  busy: {
    opacity: 0.6,
  },
  wear: {
    gap: space.xs,
  },
});
