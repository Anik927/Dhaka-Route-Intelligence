import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import RoadMap from "../../components/map/RoadMap";
import { transportModes } from "../../constants/transportModes";
import { DEFAULT_CENTER } from "../../utils/helpers";

export default function RoutePlannerScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const selectedMode = transportModes.find((m) => m.id === mode) ?? transportModes[0];

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");

  function handleFindRoutes() {
    if (!origin.trim() || !destination.trim()) {
      setError("Please enter both a start and a destination.");
      return;
    }
    setError("");
    router.push({
      pathname: "/route/results",
      params: { origin, destination, mode: selectedMode.id },
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan your route</Text>

      <RoadMap
  style={styles.map}
  reports={[]}
  initialRegion={{
    latitude: DEFAULT_CENTER.latitude,
    longitude: DEFAULT_CENTER.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  }}
/>
      <TextInput
        style={styles.input}
        placeholder="Start location (e.g. Kafrul)"
        value={origin}
        onChangeText={setOrigin}
      />
      <TextInput
        style={styles.input}
        placeholder="Destination (e.g. AIUB)"
        value={destination}
        onChangeText={setDestination}
      />

      <TouchableOpacity
        style={styles.modeButton}
        onPress={() =>
          router.push({ pathname: "/route/transport-mode", params: { mode: selectedMode.id } })
        }
      >
        <Text>Transport mode: {selectedMode.label}</Text>
      </TouchableOpacity>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryButton} onPress={handleFindRoutes}>
        <Text style={styles.primaryButtonText}>Find routes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  map: { height: 160, borderRadius: 10, overflow: "hidden", marginBottom: 12, flex: 0 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 10,
  },
  modeButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 10,
  },
  error: { color: "#c62828", marginBottom: 10 },
  primaryButton: { backgroundColor: "#0f766e", borderRadius: 10, padding: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "bold" },
});