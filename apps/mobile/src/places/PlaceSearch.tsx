import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
              <Text>{place.label}</Text>
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
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  button: {
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1f6feb",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  note: {
    marginTop: 8,
    color: "#666",
  },
  place: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  credit: {
    marginTop: 4,
    fontSize: 11,
    color: "#666",
  },
});
