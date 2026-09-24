import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { type Place, searchPlaces } from "./photon";

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "found"; places: Place[] }
  | { status: "none" }
  | { status: "failed" };

type Props = {
  onSelect: (place: Place) => void;
};

/**
 * A city or street to start from, when the position is not shared. The
 * search starts on submit, not at every letter: Photon asks for fair use.
 */
export function PlaceSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });

  async function submit() {
    if (!query.trim()) {
      return;
    }
    setSearch({ status: "searching" });
    try {
      const places = await searchPlaces(query);
      setSearch(places.length ? { status: "found", places } : { status: "none" });
    } catch {
      setSearch({ status: "failed" });
    }
  }

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="City or street"
          placeholderTextColor={color.textFaint}
          keyboardAppearance="dark"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable style={styles.button} onPress={submit} accessibilityRole="button">
          <Text style={styles.buttonText}>Search</Text>
        </Pressable>
      </View>
      {search.status === "searching" && <Text style={styles.note}>Searching…</Text>}
      {search.status === "none" && (
        <Text style={styles.note}>No place found. Try adding the city.</Text>
      )}
      {search.status === "failed" && (
        <Text style={styles.note}>
          The search failed. Check the connection and try again.
        </Text>
      )}
      {search.status === "found" && (
        <View>
          {search.places.map((place) => (
            <Pressable
              key={place.label}
              style={styles.place}
              accessibilityRole="button"
              onPress={() => {
                setSearch({ status: "idle" });
                onSelect(place);
              }}
            >
              <Text style={styles.placeText}>{place.label}</Text>
            </Pressable>
          ))}
          <Text style={styles.credit}>© OpenStreetMap contributors</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.sm,
  },
  input: {
    flex: 1,
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
  // A secondary control: the yellow belongs to "Draw route" alone.
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
  note: {
    marginTop: space.sm,
    color: color.textMuted,
  },
  place: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  placeText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  credit: {
    marginTop: space.xs,
    fontSize: fontSize.detail,
    color: color.textFaint,
  },
});
