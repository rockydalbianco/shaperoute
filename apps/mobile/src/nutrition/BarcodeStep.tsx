import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { barcodeOf, type Food } from "./foods";
import { kcalLabel } from "./MealCard";
import { type Lookup, lookUpProduct, type Product } from "./openFoodFacts";
import { ownFoodByBarcode } from "./ownFoods";
import { addFood } from "./useNutrition";

type Props = {
  /** The user's foods: a code already kept is found here, with no request. */
  own: readonly Food[];
  /** A code already read (the scanner, part G2): looked up at once. */
  startCode?: string;
  /** «Use this food»: on to its grams. */
  onFood: (food: Food) => void;
  /** «Edit»: the food is kept and its form opens. */
  onEdit: (food: Food) => void;
  /** «Add my own food», for a product that is not there: with its code. */
  onOwn: (barcode: string) => void;
  onCancel: () => void;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
};

/** What the step shows. */
type State =
  | { at: "type" }
  | { at: "looking"; barcode: string }
  /** A food of the phone with this code: nothing was asked. */
  | { at: "kept"; food: Food }
  | { at: "found"; product: Product }
  | { at: "none"; barcode: string; why: "not_found" | "no_calories" | "failed" };

/**
 * A food by its barcode (TASK-489 part G, ADR-0397): the code is typed
 * («Type the code») or comes from the scanner, and the product is looked
 * up on Open Food Facts. Only the code leaves the phone, and the step says
 * so before anything is asked. A code the phone already has is found among
 * the user's foods without asking again.
 *
 * The product found shows its name and its kilocalories for 100 g, «from
 * Open Food Facts», and that the label is what counts: «Use this food»
 * keeps it among the user's foods with its code, «Edit» opens it to be
 * corrected. One that is not there, or has no calories, is written by the
 * user: MuW makes up no number.
 */
export function BarcodeStep({
  own,
  startCode,
  onFood,
  onEdit,
  onOwn,
  onCancel,
  fetchFn,
}: Props) {
  const [text, setText] = useState(startCode ?? "");
  const [state, setState] = useState<State>({ at: "type" });
  // An answer that comes after the step is gone, or after another code was
  // asked for, is dropped.
  const asked = useRef(0);
  useEffect(
    () => () => {
      asked.current = -1;
    },
    [],
  );

  function lookUp(code: string) {
    const barcode = barcodeOf(code);
    if (barcode === null) {
      return;
    }
    const kept = ownFoodByBarcode(own, barcode);
    if (kept !== null) {
      setState({ at: "kept", food: kept });
      return;
    }
    asked.current += 1;
    const mine = asked.current;
    setState({ at: "looking", barcode });
    void lookUpProduct(barcode, { fetchFn }).then((answer: Lookup) => {
      if (asked.current !== mine) {
        return;
      }
      setState(
        answer.kind === "found"
          ? { at: "found", product: answer.product }
          : { at: "none", barcode, why: answer.kind },
      );
    });
  }

  // A code from the scanner is looked up as the step opens.
  const started = useRef(false);
  useEffect(() => {
    if (!started.current && startCode !== undefined) {
      started.current = true;
      lookUp(startCode);
    }
  });

  /** The product becomes a food of the user's, with its code. */
  function keep(product: Product): Food | null {
    return addFood({
      name: product.name,
      kcalPer100g: product.kcalPer100g,
      proteinPer100g: product.proteinPer100g,
      carbsPer100g: product.carbsPer100g,
      fatPer100g: product.fatPer100g,
      barcode: product.barcode,
      fromOpenFoodFacts: true,
    });
  }

  if (state.at === "found" || state.at === "kept") {
    const shown = state.at === "found" ? state.product : state.food;
    const fromThem = state.at === "found" || state.food.fromOpenFoodFacts === true;
    const use = () => {
      const food = state.at === "kept" ? state.food : keep(state.product);
      if (food !== null) {
        onFood(food);
      }
    };
    const edit = () => {
      const food = state.at === "kept" ? state.food : keep(state.product);
      if (food !== null) {
        onEdit(food);
      }
    };
    return (
      <View style={styles.step} testID="barcode-product">
        <Text style={styles.title} accessibilityRole="header">
          {shown.name}
        </Text>
        {fromThem && (
          <Text style={styles.mark} testID="barcode-from">
            {t("from Open Food Facts")}
          </Text>
        )}
        <Text style={styles.text}>{`${kcalLabel(shown.kcalPer100g)} / 100 g`}</Text>
        <Text style={styles.muted}>{`${t("Barcode")} ${shown.barcode ?? ""}`}</Text>
        <Text style={styles.muted}>
          {t("Check the numbers against the label: you can correct them.")}
        </Text>
        <Tap
          style={[gymStyles.button, styles.wide]}
          onPress={use}
          accessibilityRole="button"
          testID="barcode-use"
        >
          <Text style={gymStyles.buttonText}>{t("Use this food")}</Text>
        </Tap>
        <View style={gymStyles.row}>
          <Tap style={gymStyles.button} onPress={onCancel} accessibilityRole="button">
            <Text style={gymStyles.buttonText}>{t("Cancel")}</Text>
          </Tap>
          <Tap
            style={gymStyles.button}
            onPress={edit}
            accessibilityRole="button"
            testID="barcode-edit"
          >
            <Text style={gymStyles.buttonText}>{t("Edit")}</Text>
          </Tap>
        </View>
      </View>
    );
  }

  if (state.at === "none") {
    const { barcode, why } = state;
    return (
      <View style={styles.step} testID="barcode-none">
        <Text style={styles.title} accessibilityRole="header">
          {t("Type the code")}
        </Text>
        <Text style={styles.muted}>{`${t("Barcode")} ${barcode}`}</Text>
        <Text style={styles.text} testID="barcode-problem">
          {why === "not_found"
            ? t("This product is not on Open Food Facts.")
            : why === "no_calories"
              ? t("Open Food Facts has no calories for this product.")
              : t(
                  "The product could not be looked up. Check your connection and try again.",
                )}
        </Text>
        {why !== "failed" && (
          <Tap
            style={[gymStyles.button, styles.wide]}
            onPress={() => onOwn(barcode)}
            accessibilityRole="button"
            testID="barcode-own"
          >
            <Text style={gymStyles.buttonText}>{t("Add my own food")}</Text>
          </Tap>
        )}
        <View style={gymStyles.row}>
          <Tap style={gymStyles.button} onPress={onCancel} accessibilityRole="button">
            <Text style={gymStyles.buttonText}>{t("Cancel")}</Text>
          </Tap>
          <Tap
            style={gymStyles.button}
            onPress={() =>
              why === "failed" ? lookUp(barcode) : setState({ at: "type" })
            }
            accessibilityRole="button"
            testID="barcode-again"
          >
            <Text style={gymStyles.buttonText}>{t("Try again")}</Text>
          </Tap>
        </View>
      </View>
    );
  }

  const looking = state.at === "looking";
  const ready = barcodeOf(text) !== null && !looking;
  return (
    <View style={styles.step} testID="barcode-type">
      <Text style={styles.title} accessibilityRole="header">
        {t("Type the code")}
      </Text>
      <Text style={styles.label}>{t("Barcode")}</Text>
      <TextInput
        style={gymStyles.input}
        value={text}
        onChangeText={setText}
        editable={!looking}
        keyboardType="number-pad"
        maxLength={20}
        placeholderTextColor={color.textFaint}
        keyboardAppearance="dark"
        returnKeyType="search"
        autoFocus={startCode === undefined}
        onSubmitEditing={() => ready && lookUp(text)}
        accessibilityLabel={t("Barcode")}
        testID="barcode-input"
      />
      <Text style={styles.muted}>
        {looking
          ? t("Looking it up…")
          : t("Only the barcode goes to Open Food Facts, to find the product.")}
      </Text>
      <View style={gymStyles.row}>
        <Tap style={gymStyles.button} onPress={onCancel} accessibilityRole="button">
          <Text style={gymStyles.buttonText}>{t("Cancel")}</Text>
        </Tap>
        <Tap
          style={[gymStyles.button, !ready && gymStyles.disabled]}
          onPress={() => lookUp(text)}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy: looking }}
          testID="barcode-look-up"
        >
          <Text style={gymStyles.buttonText}>{t("Look up")}</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    flexShrink: 1,
    gap: space.sm,
  },
  title: {
    ...font.heading,
    color: color.text,
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
  // Neutral, as every mark that is not the route's.
  mark: {
    ...font.small,
    alignSelf: "flex-start",
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    color: color.text,
  },
  wide: {
    flex: 0,
  },
});
