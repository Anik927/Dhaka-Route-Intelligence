import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Marker } from "react-native-maps";

import RoadMap from "../components/map/RoadMap";
import { useAuth } from "../context/AuthContext";
import {
  MODE_LABELS,
  addSavedRoute,
  type TransportMode,
} from "../services/savedRouteService";
import type { Coords } from "../utils/helpers";

const MODES: TransportMode[] = ["car", "rickshaw", "walk"];

export default function AddSavedRouteScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [mode, setMode] = useState<TransportMode>("car");
  const [placing, setPlacing] = useState<"start" | "end">("start");
  const [start, setStart] = useState<Coords | null>(null);
  const [end, setEnd] = useState<Coords | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onMapPress(e: { nativeEvent: { coordinate: Coords } }) {
    const c = e.nativeEvent.coordinate;
    if (placing === "start") {
      setStart(c);
      if (!end) setPlacing("end"); // move on to the destination automatically
    } else {
      setEnd(c);
    }
  }

  async function save() {
    setError(null);
    if (!user) return setError("Please log in first.");
    if (!name.trim()) return setError("Give the route a name, for example Home to campus.");
    if (!start || !end) return setError("Tap the map to set both the start and the destination.");

    setSaving(true);
    try {
      await addSavedRoute(user.id, {
        name: name.trim().slice(0, 60),
        startLat: start.latitude,
        startLng: start.longitude,
        endLat: end.latitude,
        endLng: end.longitude,
        transportMode: mode,
      });
      router.back(); // success: back to the list
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the route.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Add saved route" }} />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Route name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Home to campus"
          maxLength={60}
        />

        <Text style={styles.label}>Usual transport</Text>
        <View style={styles.row}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.chip, mode === m && styles.chipActive]}
            >
              <Text style={[styles.chipText, mode === m && styles.chipTextActive]}>
                {MODE_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tap the map to place</Text>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => setPlacing("start")}
            style={[styles.chip, placing === "start" && styles.chipActive]}
          >
            <Text style={[styles.chipText, placing === "start" && styles.chipTextActive]}>
              Start {start ? "(set)" : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPlacing("end")}
            style={[styles.chip, placing === "end" && styles.chipActive]}
          >
            <Text style={[styles.chipText, placing === "end" && styles.chipTextActive]}>
              Destination {end ? "(set)" : ""}
            </Text>
          </TouchableOpacity>
        </View>

        <RoadMap style={styles.map} onPress={onMapPress}>
          {start && <Marker coordinate={start} title="Start" pinColor="blue" />}
          {end && <Marker coordinate={end} title="Destination" pinColor="red" />}
        </RoadMap>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={save}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save route</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  row: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  chipActive: { backgroundColor: "#1565c0", borderColor: "#1565c0" },
  chipText: { fontSize: 13, color: "#222" },
  chipTextActive: { color: "white" },
  map: { height: 300, borderRadius: 12, overflow: "hidden", flex: 0, marginTop: 4 },
  errorText: { color: "#c62828", marginTop: 12 },
  saveBtn: {
    backgroundColor: "#1565c0",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 32,
  },
  saveText: { color: "white", fontSize: 16, fontWeight: "600" },
});