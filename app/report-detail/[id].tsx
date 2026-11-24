import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";

import RoadMap from "../../components/map/RoadMap";
import { useAuth } from "../../context/AuthContext";
import {
  CATEGORY_COLORS,
  STATUS_COLORS,
  getReportById,
  voteOnReport,
  type CommunityReport,
  type VoteType,
} from "../../services/communityService";
import { timeAgo } from "../../utils/helpers";

const VOTES: { type: VoteType; label: string; color: string }[] = [
  { type: "confirm", label: "Confirm", color: "#2e7d32" },
  { type: "clear", label: "Clear now", color: "#1565c0" },
  { type: "spam", label: "Spam or fake", color: "#c62828" },
];

const STATUS_HELP: Record<CommunityReport["communityStatus"], string> = {
  Active: "Reported and still active.",
  Disputed: "Flagged by several users. A moderator will review it.",
  Cleared: "Enough users said this has cleared.",
  Expired: "This report has expired.",
};

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [report, setReport] = useState<CommunityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getReportById(String(id), user?.id ?? null);
      if (!r) setError("This report no longer exists.");
      setReport(r);
    } catch {
      setError("Could not load this report.");
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleVote(type: VoteType) {
    if (!report || !user) return;
    setVoting(true);
    try {
      setReport(await voteOnReport(report.id, user.id, type));
    } catch (e) {
      Alert.alert("Could not save your vote", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setVoting(false);
    }
  }

  const counts: Record<VoteType, number> = report
    ? { confirm: report.confirms, clear: report.clears, spam: report.spams }
    : { confirm: 0, clear: 0, spam: 0 };
  const isOwn = !!report && !!user && report.userId === user.id;

  return (
    <>
      <Stack.Screen options={{ title: "Report details", headerShown: true }} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : error || !report ? (
        <TouchableOpacity onPress={load} style={{ marginTop: 60 }}>
          <Text style={styles.errorText}>{error ?? "Report not found."} Tap to retry.</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
          {report.imageUri ? <Image source={{ uri: report.imageUri }} style={styles.photo} /> : null}

          <View style={styles.body}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[report.category] }]}>
                <Text style={styles.badgeText}>{report.category}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[report.communityStatus] }]}>
                <Text style={styles.badgeText}>{report.communityStatus}</Text>
              </View>
            </View>

            <Text style={styles.title}>{report.title}</Text>
            <Text style={styles.meta}>
              Posted {timeAgo(report.createdAt)}
              {report.source === "seed" ? "  |  team demo data" : ""}
            </Text>
            <Text style={styles.statusHelp}>{STATUS_HELP[report.communityStatus]}</Text>
            {report.expiresAt && report.communityStatus === "Active" ? (
              <Text style={styles.meta}>
                Expires about{" "}
                {new Date(report.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            ) : null}

            <Text style={styles.description}>{report.description}</Text>

            {/* The reporter's name is not shown, to keep reports anonymous */}
            <Text style={styles.meta}>Reported by a community member</Text>

            <RoadMap
              style={styles.map}
              reports={[report]}
              scrollEnabled={false}
              zoomEnabled={false}
              initialRegion={{
                latitude: report.latitude,
                longitude: report.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            />

            <Text style={styles.sectionTitle}>Is this still true?</Text>
            <View style={styles.voteRow}>
              {VOTES.map((v) => {
                const selected = report.myVote === v.type;
                return (
                  <TouchableOpacity
                    key={v.type}
                    disabled={voting || isOwn}
                    onPress={() => handleVote(v.type)}
                    style={[
                      styles.voteBtn,
                      { borderColor: v.color },
                      selected && { backgroundColor: v.color },
                      (voting || isOwn) && { opacity: 0.5 },
                    ]}
                  >
                    <Text style={[styles.voteLabel, { color: selected ? "white" : v.color }]}>{v.label}</Text>
                    <Text style={[styles.voteCount, { color: selected ? "white" : "#444" }]}>{counts[v.type]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {isOwn && <Text style={styles.meta}>You cannot vote on your own report.</Text>}
            {voting && <ActivityIndicator style={{ marginTop: 8 }} />}
          </View>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  photo: { width: "100%", height: 220 },
  body: { padding: 16 },
  badgeRow: { flexDirection: "row", marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  badgeText: { color: "white", fontSize: 12, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  meta: { fontSize: 12, color: "#666", marginTop: 2 },
  statusHelp: { fontSize: 13, color: "#444", marginTop: 6 },
  description: { fontSize: 15, color: "#222", marginTop: 14, marginBottom: 8 },
  map: { height: 180, marginTop: 14, borderRadius: 12, overflow: "hidden", flex: 0 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 8 },
  voteRow: { flexDirection: "row" },
  voteBtn: { flex: 1, borderWidth: 2, borderRadius: 10, paddingVertical: 10, marginRight: 8, alignItems: "center", backgroundColor: "white" },
  voteLabel: { fontSize: 13, fontWeight: "600" },
  voteCount: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  errorText: { color: "#c62828", textAlign: "center" },
});