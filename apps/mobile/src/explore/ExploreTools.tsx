import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { Place } from "../places/photon";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { searchCities } from "./cities";

/** The longest request the API reads (themed.py). */
export const MAX_REQUEST_LENGTH = 200;

type CityProps = {
  apiUrl: string | null;
  city: Place | null;
  onCity: (city: Place | null) => void;
  /** Injected in tests. */
  fetchFn?: typeof fetch;
};

/**
 * "Search a city" (TASK-129): any city of the world, by name, through the
 * API; the list below and the request then start from its centre.
 */
export function CityPicker({ apiUrl, city, onCity, fetchFn = fetch }: CityProps) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);

  async function search() {
    if (apiUrl === null || query.trim() === "") {
      return;
    }
    setSearching(true);
    setFailed(false);
    const cities = await searchCities(apiUrl, query, { fetchFn });
    setSearching(false);
    setFailed(cities === null);
    setFound(cities ?? []);
  }

  if (city !== null) {
    return (
      <View style={styles.section}>
        <Text style={styles.label}>CITY</Text>
        <View style={styles.row}>
          <Text style={styles.chosen}>{city.label}</Text>
          <Pressable
            style={styles.secondary}
            onPress={() => {
              onCity(null);
              setFound(null);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Change</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <Text style={styles.label}>CITY</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search a city"
          placeholderTextColor={color.textFaint}
          returnKeyType="search"
          onSubmitEditing={() => void search()}
          keyboardAppearance="dark"
          autoCorrect={false}
        />
        <Pressable
          style={styles.secondary}
          onPress={() => void search()}
          accessibilityRole="button"
          disabled={searching}
        >
          <Text style={styles.secondaryText}>{searching ? "…" : "Search"}</Text>
        </Pressable>
      </View>
      {failed && (
        <Text style={styles.note}>The city search did not answer. Try again.</Text>
      )}
      {found !== null && !failed && found.length === 0 && (
        <Text style={styles.note}>No city with that name.</Text>
      )}
      {found?.map((place) => (
        <Pressable
          key={place.label}
          style={styles.choice}
          onPress={() => onCity(place)}
          accessibilityRole="button"
        >
          <Text style={styles.choiceText}>{place.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

type AskProps = {
  /** Where the request starts from, in words: the city or "your start". */
  where: string;
  onAsk: (text: string) => void;
};

/**
 * "Ask for a route" (TASK-129): a shape through the real places of a theme,
 * e.g. "a romantic heart" or "famous places in Paris, 15 km".
 */
export function AskForRoute({ where, onAsk }: AskProps) {
  const [text, setText] = useState("");
  const ready = text.trim() !== "";
  return (
    <View style={styles.section}>
      <Text style={styles.label}>ASK FOR A ROUTE</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        maxLength={MAX_REQUEST_LENGTH}
        placeholder="e.g. a romantic heart, famous places, food 8 km"
        placeholderTextColor={color.textFaint}
        returnKeyType="go"
        onSubmitEditing={() => ready && onAsk(text.trim())}
        keyboardAppearance="dark"
      />
      <Text style={styles.note}>
        {`A shape through real places, from ${where}. Name a city in the words to go elsewhere.`}
      </Text>
      <Pressable
        style={[styles.make, !ready && styles.makeOff]}
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
  input: {
    flex: 1,
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
  choice: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  choiceText: {
    color: color.text,
    fontSize: fontSize.body,
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
