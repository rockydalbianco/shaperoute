import { useEffect, useRef, useState } from "react";
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

/** Suggestions start at this many letters, this long after the last one
 * (TASK-085, ADR-0080): Photon asks for fair use, not a request per letter. */
export const MIN_SUGGEST_LENGTH = 3;
export const SUGGEST_DELAY_MS = 500;

/**
 * A city or street to start from, when the position is not shared. Places
 * are suggested while typing, once the typing pauses; "Search" and the
 * keyboard's return key search at once.
 */
export function PlaceSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  // Only the answer to the last search asked is shown: an older one may
  // come back later, for a text that is no longer in the field.
  const asked = useRef(0);
  // The text of that search: the pause after "Search" does not ask it twice.
  const askedText = useRef("");

  async function searchFor(text: string) {
    const mine = ++asked.current;
    askedText.current = text.trim();
    // The places already suggested stay until the new ones come.
    setSearch((now) => (now.status === "found" ? now : { status: "searching" }));
    try {
      const places = await searchPlaces(text);
      if (mine === asked.current) {
        setSearch(places.length ? { status: "found", places } : { status: "none" });
      }
    } catch {
      if (mine === asked.current) {
        setSearch({ status: "failed" });
      }
    }
  }

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_SUGGEST_LENGTH) {
      return;
    }
    const timer = setTimeout(() => {
      if (text !== askedText.current) {
        void searchFor(query);
      }
    }, SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function onText(text: string) {
    setQuery(text);
    if (text.trim().length < MIN_SUGGEST_LENGTH) {
      // Too short to suggest: what was found for a longer text goes.
      asked.current += 1;
      askedText.current = "";
      setSearch({ status: "idle" });
    }
  }

  function submit() {
    if (query.trim()) {
      void searchFor(query);
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
          onChangeText={onText}
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
                asked.current += 1;
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
