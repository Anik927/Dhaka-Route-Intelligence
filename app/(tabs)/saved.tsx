import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import {
  MAX_SAVED_ROUTES,
  MODE_LABELS,
  deleteSavedRoute,
  getSavedRoutes,
  type SavedRoute,
} from "../../services/savedRouteService";

export default function SavedRoutesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setRoutes(await getSavedRoutes(user.id));
    } catch {
      setError("Could not load your saved routes.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload every time the tab comes into focus (for example after adding a route)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function confirmDelete(route: SavedRoute) {
    Alert.alert("Delete route", `Delete "${route.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (user) await deleteSavedRoute(user.id, route.id);
            load();
          } catch {
            Alert.alert("Could not delete the route", "Please try again.");
          }
        },
      },
    ]);
  }

  function openRoute(route: SavedRoute) {
    // TODO (Member 3): when the Route Planner screen exists, open it here and pass
    // route.startLat, startLng, endLat, endLng and transportMode as params, for example:
    // router.push({ pathname: "/(tabs)/route", params: { ...route } });
    Alert.alert(
      "Open in Route Planner",
      "The Route Planner is built by Member 3. Connect this button when it is ready."
    );
  }

  const full = routes.length >= MAX_SAVED_ROUTES;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Saved routes</Text>
          <Text style={styles.sub}>
            {routes.length} of {MAX_SAVED_ROUTES} saved
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, full && { opacity: 0.4 }]}
          disabled={full}
          onPress={() => router.push("/saved-add")}
        >
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : error ? (
        <TouchableOpacity onPress={load} style={{ marginTop: 40 }}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(r) => r.id}
          ListEmptyComponent={
            <Text style={styles.empty}>No saved routes yet. Tap + Add to save your regular trip.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>{MODE_LABELS[item.transportMode]}</Text>
                <Text style={styles.cardMeta}>
                  From {item.startLat.toFixed(4)}, {item.startLng.toFixed(4)}
                </Text>
                <Text style={styles.cardMeta}>
                  To {item.endLat.toFixed(4)}, {item.endLng.toFixed(4)}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.openBtn} onPress={() => openRoute(item)}>
                  <Text style={styles.openText}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete(item)}>
                  <Text style={styles.delText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", paddingHorizontal: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 12, color: "#666" },
  addBtn: { backgroundColor: "#1565c0", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  addText: { color: "white", fontWeight: "600" },
  card: { backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: "row", elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  cardMeta: { fontSize: 12, color: "#666" },
  actions: { justifyContent: "center" },
  openBtn: { backgroundColor: "#e3f2fd", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginBottom: 6 },
  openText: { color: "#1565c0", fontWeight: "600", textAlign: "center" },
  delBtn: { backgroundColor: "#fde0e0", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  delText: { color: "#c62828", fontWeight: "600", textAlign: "center" },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  errorText: { color: "#c62828", textAlign: "center" },
});