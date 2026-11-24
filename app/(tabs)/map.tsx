import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RoadMap from "../../components/map/RoadMap";
import { useAuth } from "../../context/AuthContext";
import {
  CATEGORIES,
  getActiveReports,
  type CommunityReport,
} from "../../services/communityService";
import type { ReportCategory } from "../../services/reportService";

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | ReportCategory>("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await getActiveReports(user?.id ?? null));
    } catch {
      setError("Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Reload every time the tab comes into focus (for example after posting a report)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shown = filter === "All" ? reports : reports.filter((r) => r.category === filter);

  function openDetail(id: string) {
    router.push({ pathname: "/report-detail/[id]", params: { id } });
  }

  return (
    <View style={styles.container}>
      <RoadMap reports={shown} onReportPress={openDetail} />

      {/* Category filter chips */}
      <View style={[styles.chipBar, { paddingTop: insets.top + 8 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(["All", ...CATEGORIES] as const).map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setFilter(c)}
              style={[styles.chip, filter === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Status banner: loading, error with retry, empty, or count */}
      <View style={styles.banner}>
        {loading ? (
          <ActivityIndicator />
        ) : error ? (
          <TouchableOpacity onPress={load}>
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </TouchableOpacity>
        ) : shown.length === 0 ? (
          <Text style={styles.bannerText}>No active reports here. Tap + to add one.</Text>
        ) : (
          <Text style={styles.bannerText}>
            {shown.length} active report{shown.length > 1 ? "s" : ""}. Tap a pin, then its label, for details.
          </Text>
        )}
      </View>

      {/* Add report button: opens your teammate's Report Form */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/(tabs)/report")}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chipBar: { position: "absolute", top: 0, left: 0, right: 0 },
  chipRow: { paddingHorizontal: 10 },
  chip: {
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    marginRight: 8,
    elevation: 3,
  },
  chipActive: { backgroundColor: "#1565c0" },
  chipText: { fontSize: 13, color: "#222" },
  chipTextActive: { color: "white" },
  banner: {
    position: "absolute",
    bottom: 24,
    left: 12,
    right: 84,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    elevation: 4,
  },
  bannerText: { fontSize: 13, color: "#333" },
  errorText: { fontSize: 13, color: "#c62828" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1565c0",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  fabText: { color: "white", fontSize: 30, marginTop: -2 },
});