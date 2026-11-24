import { type ReactNode, useContext, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { readNumber } from "../body/bodyUnits";
import { gymStyles } from "../gym/gymStyles";
import { t, tLater } from "../i18n";
import type { Language } from "../i18n/languages";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";
import { Tap } from "../ui/Tap";
import { BarcodeStep } from "./BarcodeStep";
import { foodNameIn, foodTableIn } from "./foodNames";
import { type Food, kcalOf, searchFoods } from "./foods";
import { kcalLabel } from "./MealCard";
import { OwnFoodForm } from "./OwnFoodForm";
import { GRAMS, type Meal, type Portion, portionOf } from "./plan";

// In English; shown with t() in the app's language.
const ADD_TO: { readonly [M in Meal]: string } = {
  breakfast: tLater("Add to breakfast"),
  lunch: tLater("Add to lunch"),
  dinner: tLater("Add to dinner"),
  snacks: tLater("Add to snacks"),
};

/** How many foods the search shows at most. */
export const SEARCH_LIMIT = 30;

/**
 * The foods the search of `query` shows: the user's own first, then the
 * base table in the app's language. With nothing typed, the user's own
 * foods, which are few and theirs.
 */
export function foodsFor(
  query: string,
  ownFoods: readonly Food[],
  language: Language,
): Food[] {
  if (query.trim() === "") {
    return ownFoods.slice(0, SEARCH_LIMIT);
  }
  return searchFoods([...ownFoods, ...foodTableIn(language)], query, SEARCH_LIMIT);
}

type FrameProps = {
  visible: boolean;
  onClose: () => void;
  testID: string;
  children: ReactNode;
};

/** A sheet of «Nutrition»: the card from the bottom, above the keyboard,
 * closed by a touch on what is behind it. */
export function NutritionSheet({ visible, onClose, testID, children }: FrameProps) {
  const insets = useContext(SafeAreaInsetsContext);
  return (
    <SheetModal visible={visible} onRequestClose={onClose} dim>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={[styles.backdrop, { minHeight: (insets?.top ?? 0) + space.xl }]}
          onPress={onClose}
          accessible={false}
          importantForAccessibility="no"
          testID={`${testID}-backdrop`}
        />
        <View
          style={[styles.sheet, { paddingBottom: (insets?.bottom ?? 0) + space.sm }]}
          testID={testID}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </SheetModal>
  );
}

type Props = {
  visible: boolean;
  meal: Meal;
  /** A portion already written: the sheet opens on its grams, with «Remove». */
  portion?: Portion | null;
  ownFoods: readonly Food[];
  language: Language;
  /** The portion to write: a new one, or the one touched with other grams. */
  onPortion: (portion: Portion) => void;
  /** «Remove», for a portion already written. */
  onRemove: () => void;
  onClose: () => void;
  /** The fake fetch of the tests, for a product looked up by its barcode. */
  fetchFn?: typeof fetch;
};

/**
 * «Add food» (TASK-489 part B, ADR-0397): the food is looked for by name
 * among the user's own and in the base table, then its grams are typed and
 * the calories of that portion are shown as an estimate. A food that is not
 * there is written by the user («Add my own food»): MuW makes up no food
 * and no number.
 */
export function AddFoodSheet(props: Props) {
  return (
    <NutritionSheet visible={props.visible} onClose={props.onClose} testID="add-food">
      {/* Mounted with the sheet: an empty search at every opening. */}
      <Body {...props} />
    </NutritionSheet>
  );
}

type Step =
  | { at: "search" }
  | { at: "grams"; food: Food }
  | { at: "own"; food: Food | null; barcode?: string }
  | { at: "barcode" };

function Body({
  meal,
  portion,
  ownFoods,
  language,
  onPortion,
  onRemove,
  onClose,
  fetchFn,
}: Props) {
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>(
    portion ? { at: "grams", food: portion.food } : { at: "search" },
  );
  const [grams, setGrams] = useState(portion ? String(portion.grams) : "");

  if (step.at === "barcode") {
    return (
      <BarcodeStep
        own={ownFoods}
        onFood={(food) => setStep({ at: "grams", food })}
        onEdit={(food) => setStep({ at: "own", food })}
        onOwn={(barcode) => setStep({ at: "own", food: null, barcode })}
        onCancel={() => setStep({ at: "search" })}
        fetchFn={fetchFn}
      />
    );
  }

  if (step.at === "own") {
    return (
      <OwnFoodForm
        food={step.food}
        startName={query.trim()}
        barcode={step.barcode}
        onSaved={(food) => setStep({ at: "grams", food })}
        onDeleted={() => setStep({ at: "search" })}
        onCancel={() =>
          setStep(step.food ? { at: "grams", food: step.food } : { at: "search" })
        }
      />
    );
  }

  if (step.at === "grams") {
    const food = step.food;
    const typed = readNumber(grams);
    const made = typed === null ? null : portionOf(food, typed);
    const own = ownFoods.some((item) => item.key === food.key);
    return (
      <View style={styles.step} testID="add-food-grams">
        <Text style={styles.title} accessibilityRole="header">
          {foodNameIn(food, language)}
        </Text>
        <Text style={styles.muted}>
          {food.fromOpenFoodFacts === true
            ? `${kcalLabel(food.kcalPer100g)} / 100 g · ${t("from Open Food Facts")}`
            : `${kcalLabel(food.kcalPer100g)} / 100 g`}
        </Text>
        <Text style={styles.label}>{t("Grams")}</Text>
        <TextInput
          style={gymStyles.input}
          value={grams}
          onChangeText={setGrams}
          keyboardType="number-pad"
          maxLength={String(GRAMS.max).length}
          placeholderTextColor={color.textFaint}
          keyboardAppearance="dark"
          returnKeyType="done"
          autoFocus
          accessibilityLabel={t("Grams")}
          testID="add-food-grams-input"
        />
        <View style={styles.estimate}>
          <Text style={styles.muted}>{t("Estimate")}</Text>
          <Text style={styles.text} testID="add-food-estimate">
            {made === null ? "—" : kcalLabel(kcalOf(food, made.grams))}
          </Text>
        </View>
        <View style={gymStyles.row}>
          {portion ? (
            <Tap
              style={gymStyles.button}
              onPress={onRemove}
              accessibilityRole="button"
              testID="add-food-remove"
            >
              <Text style={gymStyles.buttonText}>{t("Remove")}</Text>
            </Tap>
          ) : (
            <Tap
              style={gymStyles.button}
              onPress={() => setStep({ at: "search" })}
              accessibilityRole="button"
            >
              <Text style={gymStyles.buttonText}>{t("Back")}</Text>
            </Tap>
          )}
          <Tap
            style={[gymStyles.button, made === null && gymStyles.disabled]}
            onPress={() => made !== null && onPortion(made)}
            disabled={made === null}
            accessibilityRole="button"
            accessibilityState={{ disabled: made === null }}
            testID="add-food-confirm"
          >
            <Text style={gymStyles.buttonText}>{portion ? t("Save") : t("Add")}</Text>
          </Tap>
        </View>
        {own && !portion && (
          <Tap
            style={styles.link}
            onPress={() => setStep({ at: "own", food })}
            accessibilityRole="button"
            testID="add-food-edit-own"
          >
            <Text style={styles.linkText}>{t("Edit")}</Text>
          </Tap>
        )}
      </View>
    );
  }

  const found = foodsFor(query, ownFoods, language);
  return (
    <View style={styles.step}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {t(ADD_TO[meal])}
        </Text>
        <Pressable
          style={styles.close}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Close")}
          testID="add-food-close"
        >
          <Text style={styles.closeMark}>✕</Text>
        </Pressable>
      </View>
      <TextInput
        style={gymStyles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={t("Search food")}
        placeholderTextColor={color.textFaint}
        keyboardAppearance="dark"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={t("Search food")}
        testID="add-food-search"
      />
      <ScrollView
        style={styles.results}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {found.map((food) => (
          <Tap
            key={food.key}
            style={styles.result}
            onPress={() => setStep({ at: "grams", food })}
            accessibilityRole="button"
            testID={`add-food-result-${food.key}`}
          >
            <Text style={styles.resultName} numberOfLines={2}>
              {foodNameIn(food, language)}
              {food.source === "own" && (
                <Text style={styles.muted}>{` · ${t("My food")}`}</Text>
              )}
            </Text>
            <Text style={styles.muted}>{`${kcalLabel(food.kcalPer100g)} / 100 g`}</Text>
          </Tap>
        ))}
        {found.length === 0 && query.trim() !== "" && (
          <Text style={styles.none}>{t("No food found.")}</Text>
        )}
        <Tap
          style={styles.link}
          onPress={() => setStep({ at: "own", food: null })}
          accessibilityRole="button"
          testID="add-food-own"
        >
          <Text style={styles.linkText}>{t("Add my own food")}</Text>
        </Tap>
        {/* A packaged product by the code on its pack (part G); the
            scanner comes with the native build. */}
        <Tap
          style={styles.link}
          onPress={() => setStep({ at: "barcode" })}
          accessibilityRole="button"
          testID="add-food-barcode"
        >
          <Text style={styles.linkText}>{t("Type the code")}</Text>
        </Tap>
      </ScrollView>
    </View>
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
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.surface,
  },
  step: {
    flexShrink: 1,
    gap: space.sm,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: {
    ...font.heading,
    flexShrink: 1,
    color: color.text,
  },
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeMark: {
    ...font.body,
    color: color.textMuted,
  },
  label: {
    ...font.small,
    color: color.textMuted,
    marginTop: space.xs,
  },
  text: {
    ...font.body,
    color: color.text,
  },
  muted: {
    ...font.small,
    color: color.textMuted,
  },
  estimate: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  results: {
    flexShrink: 1,
  },
  result: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingVertical: space.xs,
  },
  resultName: {
    ...font.body,
    flexShrink: 1,
    color: color.text,
  },
  none: {
    ...font.body,
    color: color.textMuted,
    paddingVertical: space.sm,
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  linkText: {
    ...font.body,
    color: color.text,
    textDecorationLine: "underline",
  },
});
