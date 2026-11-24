import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  STATUS_COLORS,
  getActiveReports,
  type CommunityReport,
} from "../../services/communityService";
import type { ReportCategory } from "../../services/reportService";
import { getUserLocation, haversineKm, timeAgo, type Coords } from "../../utils/helpers";

type SortMode = "newest" | "nearest";

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | ReportCategory>("All");
  const [sort, setSort] = useState<SortMode>("newest");
  const [coords, setCoords] = useState<Coords | null>(null);

  // Ask for the phone's location once. If it is denied, "nearest" falls back to newest.
  useEffect(() => {
    getUserLocation().then(setCoords);
  }, []);

  const load = useCallback(
    async (pullToRefresh = false) => {
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setReports(await getActiveReports(user?.id ?? null));
      } catch {
        setError("Could not load the feed.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const items = useMemo(() => {
    const list = filter === "All" ? reports : reports.filter((r) => r.category === filter);
    const withDistance = list.map((report) => ({
      report,
      km: coords ? haversineKm(coords, report) : null,
    }));
    withDistance.sort((a, b) =>
      sort === "nearest" && coords
        ? (a.km ?? 0) - (b.km ?? 0)
        : new Date(b.report.createdAt).getTime() - new Date(a.report.createdAt).getTime()
    );
    return withDistance;
  }, [reports, filter, sort, coords]);

  const header = (
    <View>
      <View style={styles.sortRow}>
        {(["newest", "nearest"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSort(s)}
            style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
          >
            <Text style={[styles.sortText, sort === s && styles.sortTextActive]}>
              {s === "newest" ? "Newest" : "Nearest"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {sort === "nearest" && !coords && (
        <Text style={styles.note}>Location is off, so reports are sorted by newest.</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
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
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Road reports</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : error ? (
        <TouchableOpacity onPress={() => load()} style={{ marginTop: 40 }}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.report.id}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={<Text style={styles.empty}>No active reports. Pull down to refresh.</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const r = item.report;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: "/report-detail/[id]", params: { id: r.id } })}
              >
                {r.imageUri ? <Image source={{ uri: r.imageUri }} style={styles.thumb} /> : null}
                <View style={styles.cardBody}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[r.category] }]}>
                      <Text style={styles.badgeText}>{r.category}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[r.communityStatus] }]}>
                      <Text style={styles.badgeText}>{r.communityStatus}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {timeAgo(r.createdAt)}
                    {item.km != null ? `  |  ${item.km.toFixed(1)} km away` : ""}
                    {`  |  ${r.confirms} confirm${r.confirms === 1 ? "" : "s"}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", paddingHorizontal: 12 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  sortRow: { flexDirection: "row", marginBottom: 8 },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: "#e0e0e0", marginRight: 8 },
  sortBtnActive: { backgroundColor: "#1565c0" },
  sortText: { fontSize: 13, color: "#222" },
  sortTextActive: { color: "white" },
  note: { fontSize: 12, color: "#777", marginBottom: 6 },
  chip: { backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: "#ddd" },
  chipActive: { backgroundColor: "#1565c0", borderColor: "#1565c0" },
  chipText: { fontSize: 13, color: "#222" },
  chipTextActive: { color: "white" },
  card: { backgroundColor: "white", borderRadius: 12, marginBottom: 10, overflow: "hidden", elevation: 2 },
  thumb: { width: "100%", height: 140 },
  cardBody: { padding: 12 },
  badgeRow: { flexDirection: "row", marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6 },
  badgeText: { color: "white", fontSize: 11, fontWeight: "600" },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  cardMeta: { fontSize: 12, color: "#666" },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  errorText: { color: "#c62828", textAlign: "center" },
});