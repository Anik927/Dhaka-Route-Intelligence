import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import RouteCard from "../../components/route/RouteCard";
import type { RouteOption } from "../../constants/mockRoutes";
import { getRouteOptions } from "../../services/routeService";

export default function RouteResultsScreen() {
  const router = useRouter();
  const { origin, destination, mode } = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    mode?: string;
  }>();

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRouteOptions(origin ?? "", destination ?? "", mode ?? "car");
      setRoutes(data);
      setSelectedId(data.find((r) => r.recommended)?.id ?? data[0]?.id ?? null);
    } catch {
      setError("Could not load routes.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, mode]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} />;
  if (error) {
    return (
      <TouchableOpacity onPress={load} style={{ marginTop: 60 }}>
        <Text style={styles.errorText}>{error} Tap to retry.</Text>
      </TouchableOpacity>
    );
  }

  const selectedRoute = routes.find((r) => r.id === selectedId);

  return (
    <View style={styles.container}>
      <Text style={styles.trip}>{origin} to {destination}</Text>
      <View style={styles.mapPlaceholder}>
        <Text>Map placeholder: showing {selectedRoute?.name}</Text>
      </View>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text>No routes found.</Text>}
        renderItem={({ item }) => (
          <RouteCard route={item} selected={item.id === selectedId} onPress={() => setSelectedId(item.id)} />
        )}
      />

      <TouchableOpacity
        style={styles.primaryButton}
        disabled={selectedId == null}
        onPress={() => router.push({ pathname: "/route/details", params: { id: selectedId! } })}
      >
        <Text style={styles.primaryButtonText}>View details</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  trip: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  mapPlaceholder: { height: 200, backgroundColor: "#ddd", borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  errorText: { color: "#c62828", textAlign: "center" },
  primaryButton: { backgroundColor: "#1565c0", borderRadius: 10, padding: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "bold" },
});