import type { CityChosenSignal, Signal } from "@shaperoute/shared-types/src/signals";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { sendSignal } from "../api/signals";
import type { Place } from "../places/photon";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { searchCities, suggestCities } from "./cities";
import {
  CATEGORIES,
  cityShort,
  exampleFor,
  FEATURED_CITIES,
  isSpot,
  requestFor,
  suggestionDetail,
  whereFor,
} from "./presets";

/** The longest request the API reads (themed.py). */
export const MAX_REQUEST_LENGTH = 200;
/** A pause in typing before the suggestions are asked (as TASK-089). */
export const SUGGEST_DELAY_MS = 250;

type CityProps = {
  apiUrl: string | null;
  city: Place | null;
  onCity: (city: Place | null) => void;
  /** The cities chosen last, first among the chips (TASK-134). */
  recent?: Place[];
  /** Injected in tests. */
  fetchFn?: typeof fetch;
  suggestDelayMs?: number;
  /** Tells the API the city chosen, and how (TASK-142); POST /signals. */
  onSignal?: (signal: Signal) => void;
};

/**
 * "City" (TASK-129, TASK-134): cities to tap, the recent first, then cities
 * from around the world; or "Type a city or a place", with cities and places
 * suggested while typing (TASK-138). The list below and the requests then
 * start from the city's centre, or from the place.
 */
export function CityPicker({
  apiUrl,
  city,
  onCity,
  recent = [],
  fetchFn = fetch,
  suggestDelayMs = SUGGEST_DELAY_MS,
  onSignal = (signal) => void sendSignal(signal, { baseUrl: apiUrl, fetchFn }),
}: CityProps) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; places: Place[] | null } | null>(
    null,
  );
  const [opening, setOpening] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Suggestions while typing, after a short pause; the last query wins.
  useEffect(() => {
    const text = query.trim();
    if (apiUrl === null || text.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void suggestCities(apiUrl, text, { fetchFn, signal: controller.signal }).then(
        (places) => {
          if (!controller.signal.aborted) {
            setFound({ query: text, places });
          }
        },
      );
    }, suggestDelayMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [apiUrl, query, fetchFn, suggestDelayMs]);

  /** A city or a place chosen, and how: a suggestion picked never calls
   * /cities, so the API hears of it only from the signal (TASK-142). */
  function choose(place: Place, via: CityChosenSignal["via"]) {
    Keyboard.dismiss();
    setQuery("");
    setFound(null);
    setFailed(false);
    onCity(place);
    onSignal({
      kind: "city_chosen",
      label: place.label,
      point: place.point,
      ...(isSpot(place) ? { place: true } : {}),
      via,
    });
  }

  /** A city by name (a chip, or Enter): its centre from the API. */
  async function open(name: string, via: "featured" | "typed") {
    if (apiUrl === null) {
      setFailed(true);
      return;
    }
    setOpening(name);
    setFailed(false);
    const cities = await searchCities(apiUrl, name, { fetchFn });
    setOpening(null);
    if (cities !== null && cities.length > 0) {
      choose(cities[0], via);
    } else {
      setFailed(true);
    }
  }

  const typed = query.trim();
  const suggestions = typed.length >= 2 && found?.query === typed ? found.places : null;

  /** Enter takes the first suggestion, as a tap on it; else the city by name. */
  function submit() {
    if (suggestions !== null && suggestions.length > 0) {
      choose(suggestions[0], "suggestion");
    } else if (typed !== "") {
      void open(typed, "typed");
    }
  }
  const recentNames = new Set(recent.map((p) => cityShort(p.label)));
  const featured = FEATURED_CITIES.filter((name) => !recentNames.has(name));

  return (
    <View style={styles.section}>
      <Text style={styles.label}>CITY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chips}>
          {recent.map((place) => (
            <Chip
              key={`recent-${place.label}`}
              label={cityShort(place.label)}
              on={city?.label === place.label}
              recent
              onPress={() => choose(place, "recent")}
            />
          ))}
          {featured.map((name) => (
            <Chip
              key={name}
              label={opening === name ? `${name} …` : name}
              on={city !== null && cityShort(city.label) === name}
              onPress={() => void open(name, "featured")}
            />
          ))}
        </View>
      </ScrollView>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setFailed(false);
        }}
        placeholder="Type a city or a place"
        placeholderTextColor={color.textFaint}
        returnKeyType="search"
        onSubmitEditing={submit}
        keyboardAppearance="dark"
        autoCorrect={false}
        accessibilityLabel="Type a city or a place"
      />
      {suggestions?.map((place) => (
        <Pressable
          key={place.label}
          style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
          onPress={() => choose(place, "suggestion")}
          accessibilityRole="button"
          accessibilityLabel={place.label}
        >
          <Text style={styles.choiceText} numberOfLines={1}>
            {cityShort(place.label)}
          </Text>
          <Text style={styles.choiceDetail} numberOfLines={1}>
            {suggestionDetail(place)}
          </Text>
        </Pressable>
      ))}
      {suggestions !== null && suggestions.length === 0 && (
        <Text style={styles.note}>{`No city or place matches “${typed}”.`}</Text>
      )}
      {(failed || (suggestions === null && found?.query === typed && typed !== "")) && (
        <Text style={styles.error}>The search did not answer. Try again.</Text>
      )}
      {city !== null && (
        <View style={styles.row}>
          <Text style={styles.chosen}>{city.label}</Text>
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={() => onCity(null)}
            accessibilityRole="button"
            accessibilityLabel="Back to my start"
          >
            <Text style={styles.secondaryText}>My start</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Chip({
  label,
  on,
  recent = false,
  onPress,
}: {
  label: string;
  on: boolean;
  recent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        on && styles.chipOn,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityHint={recent ? "A city you chose before" : undefined}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>
        {recent ? `↺ ${label}` : label}
      </Text>
    </Pressable>
  );
}

type AskProps = {
  /** The city the requests are for, or null for the start. */
  city?: Place | null;
  /** Where the request starts from, in words: the city or "your start". */
  where: string;
  onAsk: (text: string) => void;
};

/**
 * "Ask for a route" (TASK-129, TASK-134): a category is one tap, "Food in
 * New York" straight away; or a request in words.
 */
export function AskForRoute({ city = null, where, onAsk }: AskProps) {
  const [text, setText] = useState("");
  const ready = text.trim() !== "";
  const place = whereFor(city);
  return (
    <View style={styles.section}>
      <Text style={styles.label}>ASK FOR A ROUTE</Text>
      <Text style={styles.note}>
        {`A shape through real places ${place}. Tap one to make it.`}
      </Text>
      <View style={styles.grid}>
        {CATEGORIES.map((category) => (
          <Pressable
            key={category}
            style={({ pressed }) => [styles.category, pressed && styles.pressed]}
            onPress={() => onAsk(requestFor(category, city))}
            accessibilityRole="button"
            accessibilityLabel={requestFor(category, city)}
          >
            <Text style={styles.categoryText}>{category}</Text>
            <Text style={styles.categoryWhere} numberOfLines={1}>
              {place}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>OR IN YOUR WORDS</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        maxLength={MAX_REQUEST_LENGTH}
        placeholder={exampleFor(city)}
        placeholderTextColor={color.textFaint}
        returnKeyType="go"
        onSubmitEditing={() => ready && onAsk(text.trim())}
        keyboardAppearance="dark"
      />
      <Text style={styles.note}>
        {`From ${where}. Name a city in the words to go elsewhere.`}
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.make,
          !ready && styles.makeOff,
          pressed && styles.pressed,
        ]}
        onPress={() => onAsk(text.trim())}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready }}
      >
        <Text style={styles.makeText}>Make my route</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  chips: {
    flexDirection: "row",
    gap: space.sm,
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chipOn: {
    backgroundColor: color.text,
    borderColor: color.text,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  chipTextOn: {
    color: color.background,
    fontWeight: fontWeight.semibold,
  },
  // A light touch: what is pressed dims, nothing moves.
  pressed: {
    opacity: 0.6,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.border,
    color: color.text,
    fontSize: fontSize.input,
  },
  chosen: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  error: {
    color: color.error,
    fontSize: fontSize.small,
  },
  choice: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  choiceText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  choiceDetail: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  // Two columns on a phone, more where there is room.
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  category: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 56,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  categoryText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  categoryWhere: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  secondary: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  secondaryText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  // Yellow: it produces a route, like "Draw route" (UI.md, Il tema).
  make: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.accent,
  },
  makeOff: {
    opacity: 0.4,
  },
  makeText: {
    color: color.onAccent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
});
