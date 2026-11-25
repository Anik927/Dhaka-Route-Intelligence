import { useCallback, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";

import { Stack, useFocusEffect, useRouter } from "expo-router";

import RoleGuard from "../../components/auth/RoleGuard";

import {
  getFlaggedReports,
  AUTO_FLAG_THRESHOLD,
  type FlaggedReport,
} from "../../services/moderationService";
import { timeAgo } from "../../utils/helpers";

type QueueFilter = "All" | "Auto" | "User" | "Hidden";

// Flagged Queue content
function FlaggedQueueContent() {
  const router = useRouter();

  const [flagged, setFlagged] = useState<FlaggedReport[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load the queue every time the screen becomes active
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          const queue = await getFlaggedReports();

          if (isActive) {
            setFlagged(queue);
          }
        } catch (error) {
          console.error("Error loading flagged reports:", error);

          if (isActive) {
            Alert.alert("Error", "Unable to load the flagged queue.");
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      load();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      setFlagged(await getFlaggedReports());
    } finally {
      setRefreshing(false);
    }
  };

  // Summary counts
  const autoCount = flagged.filter((item) => item.flagLevel === "auto").length;
  const userCount = flagged.filter((item) => item.flagLevel === "user").length;
  const hiddenCount = flagged.filter((item) => item.hidden).length;

  // Filter the queue
  const filteredQueue = flagged.filter((item) => {
    if (filter === "Auto") return item.flagLevel === "auto";
    if (filter === "User") return item.flagLevel === "user";
    if (filter === "Hidden") return item.hidden;

    return true;
  });

  const openReview = (report: FlaggedReport) => {
    router.push({
      pathname: "/admin/review/[id]",
      params: { id: report.id },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.heading}>Flagged Reports</Text>

      <Text style={styles.subtitle}>
        Reports that users marked as spam or fake. Review each one and verify,
        reject, or hide it.
      </Text>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: "#FEE2E2" }]}>
          <Text style={[styles.summaryNumber, { color: "#DC2626" }]}>
            {autoCount}
          </Text>

          <Text style={[styles.summaryLabel, { color: "#991B1B" }]}>
            Auto-flagged
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: "#FEF3C7" }]}>
          <Text style={[styles.summaryNumber, { color: "#D97706" }]}>
            {userCount}
          </Text>

          <Text style={[styles.summaryLabel, { color: "#92400E" }]}>
            User-flagged
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: "#E2E8F0" }]}>
          <Text style={[styles.summaryNumber, { color: "#475569" }]}>
            {hiddenCount}
          </Text>

          <Text style={[styles.summaryLabel, { color: "#334155" }]}>
            Hidden
          </Text>
        </View>
      </View>

      {/* Threshold note */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          A report is auto-flagged once {AUTO_FLAG_THRESHOLD} users mark it as
          spam (the same point where the feed shows it as Disputed). Reports
          with at least one spam vote also appear here.
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {(["All", "Auto", "User", "Hidden"] as QueueFilter[]).map((item) => (
          <Pressable
            key={item}
            style={[
              styles.filterButton,
              filter === item && styles.activeFilter,
            ]}
            onPress={() => setFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && styles.activeFilterText,
              ]}
            >
              {item === "Auto"
                ? "Auto-flagged"
                : item === "User"
                  ? "User-flagged"
                  : item}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0F766E" />

          <Text style={styles.emptyText}>Loading flagged reports...</Text>
        </View>
      ) : filteredQueue.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Queue Is Clear</Text>

          <Text style={styles.emptyText}>
            No reports are flagged in this category right now.
          </Text>
        </View>
      ) : (
        /* Flagged Report Cards */
        filteredQueue.map((item) => (
          <View key={item.id} style={styles.reportCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.category}>{item.category}</Text>

              <View
                style={[
                  styles.flagBadge,
                  {
                    backgroundColor:
                      item.flagLevel === "auto" ? "#DC2626" : "#D97706",
                  },
                ]}
              >
                <Text style={styles.flagBadgeText}>
                  {item.flagLevel === "auto"
                    ? `Auto-flagged (${item.spams})`
                    : `User-flagged (${item.spams})`}
                </Text>
              </View>
            </View>

            <Text style={styles.reportTitle}>{item.title}</Text>

            <Text style={styles.description}>{item.description}</Text>

            <Text style={styles.userName}>Submitted by: {item.userName}</Text>

            <Text style={styles.date}>
              {timeAgo(item.createdAt)} | Status: {item.status}
            </Text>

            {/* Vote summary */}
            <View style={styles.voteRow}>
              <Text style={[styles.voteText, { color: "#DC2626" }]}>
                Spam: {item.spams}
              </Text>

              <Text style={[styles.voteText, { color: "#16A34A" }]}>
                Confirms: {item.confirms}
              </Text>

              <Text style={[styles.voteText, { color: "#2563EB" }]}>
                Clears: {item.clears}
              </Text>
            </View>

            {item.hidden ? (
              <View style={styles.hiddenBadge}>
                <Text style={styles.hiddenBadgeText}>
                  Hidden from the map and feed
                </Text>
              </View>
            ) : null}

            {/* Review Button */}
            <Pressable
              style={styles.reviewButton}
              onPress={() => openReview(item)}
            >
              <Text style={styles.reviewButtonText}>Open Review</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 7,
    marginBottom: 22,
    lineHeight: 21,
  },

  summaryContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 25,
    fontWeight: "bold",
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },

  infoBox: {
    backgroundColor: "#CCFBF1",
    padding: 15,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 20,
  },

  infoText: {
    fontSize: 12,
    color: "#134E4A",
    lineHeight: 19,
  },

  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },

  filterButton: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },

  activeFilter: {
    backgroundColor: "#0F766E",
  },

  filterText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#FFFFFF",
  },

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
  },

  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
  },

  reportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  category: {
    color: "#0F766E",
    fontWeight: "bold",
    fontSize: 13,
  },

  flagBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 15,
  },

  flagBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 11,
  },

  reportTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 14,
  },

  description: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 21,
    marginTop: 7,
  },

  userName: {
    fontSize: 13,
    color: "#475569",
    marginTop: 12,
    fontWeight: "600",
  },

  date: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },

  voteRow: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 9,
    padding: 11,
    marginTop: 12,
  },

  voteText: {
    fontSize: 12,
    fontWeight: "bold",
  },

  hiddenBadge: {
    backgroundColor: "#E2E8F0",
    padding: 10,
    borderRadius: 9,
    marginTop: 12,
  },

  hiddenBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },

  reviewButton: {
    backgroundColor: "#0F766E",
    padding: 13,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  reviewButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});

// Protect Flagged Queue (moderators and admins)
export default function FlaggedQueueScreen() {
  return (
    <RoleGuard allowedRoles={["moderator", "admin"]}>
      <Stack.Screen options={{ title: "Flagged Queue" }} />
      <FlaggedQueueContent />
    </RoleGuard>
  );
}
