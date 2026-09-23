import { SHAPES } from "@shaperoute/shared-types";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ShapeRoute</Text>
      <Text style={styles.label}>Shapes</Text>
      {SHAPES.map((shape) => (
        <Text key={shape} style={styles.shape}>
          {shape}
        </Text>
      ))}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  shape: {
    fontSize: 20,
    marginVertical: 4,
  },
});
