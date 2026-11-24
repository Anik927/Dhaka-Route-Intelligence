import { useCallback, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import RoleGuard from "../../components/auth/RoleGuard";
import { useAuth } from "../../context/AuthContext";

import { getReports, type RoadReport } from "../../services/reportService";
import {
  getFlaggedReports,
  getModerationRecord,
  hideReport,
  restoreReport,
  toActor,
  type ModerationRecord,
} from "../../services/moderationService";
import { isSeeded, seedDemoData } from "../../services/seedService";

type AdminFilter = "All" | "Pending" | "Verified" | "Rejected" | "Hidden";

// One report row with its moderation state
interface AdminReportRow {
  report: RoadReport;
  moderation: ModerationRecord;
}

// Admin Reports content
function AdminReportsContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [filter, setFilter] = useState<AdminFilter>("All");
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [seeded, setSeeded] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Inline hide form: which card is open and its reason
  const [hideFormId, setHideFormId] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState("");

  // Load all reports with their moderation state
  const loadData = async () => {
    const [reports, flagged, seededFlag] = await Promise.all([
      getReports(),
      getFlaggedReports(),
      isSeeded(),
    ]);

    const sortedReports = [...reports].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const loadedRows: AdminReportRow[] = await Promise.all(
      sortedReports.map(async (report) => ({
        report,
        moderation: await getModerationRecord(report.id),
      })),
    );

    setRows(loadedRows);
    setFlaggedCount(flagged.length);
    setSeeded(seededFlag);
  };

  // Reload every time the screen becomes active
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          if (!isActive) return;

          await loadData();
        } catch (error) {
          console.error("Error loading reports:", error);

          if (isActive) {
            Alert.alert("Error", "Unable to load reports.");
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

      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  // Hide a report using the inline reason input
  const handleHide = async (row: AdminReportRow) => {
    if (!user) return;

    if (updatingId) return;

    setUpdatingId(row.report.id);

    try {
      const result = await hideReport(
        row.report.id,
        row.report.title,
        toActor(user),
        hideReason,
      );

      if (result.success) {
        setHideFormId(null);
        setHideReason("");

        Alert.alert("Success", result.message);

        await handleRefresh();
      } else {
        Alert.alert("Error", result.message);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Restore a hidden report
  const handleRestore = (row: AdminReportRow) => {
    if (!user) return;

    Alert.alert(
      "Restore Report",
      `Bring "${row.report.title}" back to the map and feed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            if (updatingId) return;

            setUpdatingId(row.report.id);

            try {
              const result = await restoreReport(
                row.report.id,
                row.report.title,
                toActor(user),
              );

              if (result.success) {
                Alert.alert("Success", result.message);

                await handleRefresh();
              } else {
                Alert.alert("Error", result.message);
              }
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  // Seed demo data for the moderation demo
  const handleSeed = () => {
    if (!user) return;

    Alert.alert(
      "Load Demo Data",
      "Create demo users, reports, spam votes, and one suspension? This runs only once.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Load",
          onPress: async () => {
            try {
              const result = await seedDemoData(toActor(user));

              Alert.alert(
                result.seeded ? "Success" : "Already loaded",
                result.message,
              );

              await handleRefresh();
            } catch (error) {
              console.error("Seed error:", error);

              Alert.alert("Error", "Unable to load the demo data.");
            }
          },
        },
      ],
    );
  };

  // Summary counts
  const hiddenCount = rows.filter((row) => row.moderation.hidden).length;
  const pendingCount = rows.filter(
    (row) => row.report.status === "Pending",
  ).length;

  // Apply the filter
  const filteredRows = rows.filter((row) => {
    if (filter === "All") return true;
    if (filter === "Hidden") return row.moderation.hidden;

    return row.report.status === filter;
  });

  const getStatusColor = (status: RoadReport["status"]) => {
    switch (status) {
      case "Verified":
        return "#16A34A";

      case "Rejected":
        return "#DC2626";

      default:
        return "#D97706";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.heading}>Admin Reports</Text>

      <Text style={styles.subtitle}>
        Monitor every submitted report. Hide rule-breaking reports or restore
        them later.
      </Text>

      {/* Shortcut: Flagged Queue */}
      <Pressable
        style={styles.shortcutCard}
        onPress={() => router.push("/admin/flagged")}
      >
        <View style={styles.shortcutLeft}>
          <Text style={styles.shortcutTitle}>Flagged Queue</Text>

          <Text style={styles.shortcutText}>
            Reports users marked as spam or fake.
          </Text>
        </View>

        <View style={styles.shortcutBadge}>
          <Text style={styles.shortcutBadgeText}>{flaggedCount}</Text>
        </View>
      </Pressable>

      {/* Shortcut: Audit Log */}
      <Pressable
        style={styles.shortcutCard}
        onPress={() => router.push("/admin/audit-log")}
      >
        <View style={styles.shortcutLeft}>
          <Text style={styles.shortcutTitle}>Audit Log</Text>

          <Text style={styles.shortcutText}>
            Every moderation action, with who did it.
          </Text>
        </View>
      </Pressable>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{rows.length}</Text>

          <Text style={styles.summaryLabel}>Total</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: "#FEF3C7" }]}>
          <Text style={[styles.summaryNumber, { color: "#D97706" }]}>
            {pendingCount}
          </Text>

          <Text style={[styles.summaryLabel, { color: "#92400E" }]}>
            Pending
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

      {/* Seed demo data */}
      {!seeded ? (
        <Pressable style={styles.seedButton} onPress={handleSeed}>
          <Text style={styles.seedButtonText}>
            Load demo data (users, reports, votes, suspension)
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.seedNote}>
          Demo data already loaded. Reset the app storage to load it again.
        </Text>
      )}

      {/* Filters */}
      <Text style={styles.sectionTitle}>All Reports</Text>

      <View style={styles.filterContainer}>
        {(
          ["All", "Pending", "Verified", "Rejected", "Hidden"] as AdminFilter[]
        ).map((item) => (
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
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0F766E" />

          <Text style={styles.emptyText}>Loading reports...</Text>
        </View>
      ) : filteredRows.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Reports Found</Text>

          <Text style={styles.emptyText}>
            There are no reports in this category yet.
          </Text>
        </View>
      ) : (
        /* Report Cards */
        filteredRows.map((row) => (
          <View key={row.report.id} style={styles.reportCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.category}>{row.report.category}</Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: row.moderation.hidden
                      ? "#475569"
                      : getStatusColor(row.report.status),
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {row.moderation.hidden ? "Hidden" : row.report.status}
                </Text>
              </View>
            </View>

            <Text style={styles.reportTitle}>{row.report.title}</Text>

            <Text style={styles.description}>{row.report.description}</Text>

            <Text style={styles.userName}>
              Submitted by: {row.report.userName}
            </Text>

            {row.report.imageUri ? (
              <Image
                source={{ uri: row.report.imageUri }}
                style={styles.reportImage}
                resizeMode="cover"
              />
            ) : null}

            {row.moderation.hidden ? (
              <View style={styles.hiddenInfoBox}>
                <Text style={styles.hiddenInfoText}>
                  Hidden by {row.moderation.hiddenBy}: {row.moderation.reason}
                </Text>
              </View>
            ) : null}

            <Text style={styles.date}>
              Submitted: {new Date(row.report.createdAt).toLocaleString()}
            </Text>

            <Text style={styles.reportId}>Report ID: {row.report.id}</Text>

            {/* Actions */}
            <View style={styles.actionRow}>
              <Pressable
                style={styles.reviewButton}
                onPress={() =>
                  router.push({
                    pathname: "/admin/review/[id]",
                    params: { id: row.report.id },
                  })
                }
              >
                <Text style={styles.reviewButtonText}>Review</Text>
              </Pressable>

              {row.moderation.hidden ? (
                <Pressable
                  disabled={updatingId !== null}
                  style={[
                    styles.restoreButton,
                    updatingId !== null && styles.disabledButton,
                  ]}
                  onPress={() => handleRestore(row)}
                >
                  <Text style={styles.restoreButtonText}>Restore</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.hideToggleButton}
                  onPress={() => {
                    setHideFormId(
                      hideFormId === row.report.id ? null : row.report.id,
                    );
                    setHideReason("");
                  }}
                >
                  <Text style={styles.hideToggleButtonText}>Hide</Text>
                </Pressable>
              )}
            </View>

            {/* Inline hide reason */}
            {hideFormId === row.report.id && !row.moderation.hidden ? (
              <View style={styles.hideForm}>
                <TextInput
                  style={styles.reasonInput}
                  value={hideReason}
                  onChangeText={setHideReason}
                  placeholder="Reason for hiding (shown in the audit log)"
                  placeholderTextColor="#94A3B8"
                  multiline
                />

                <View style={styles.hideFormActions}>
                  <Pressable
                    style={styles.cancelHideButton}
                    onPress={() => {
                      setHideFormId(null);
                      setHideReason("");
                    }}
                  >
                    <Text style={styles.cancelHideText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    disabled={
                      updatingId !== null || hideReason.trim().length < 3
                    }
                    style={[
                      styles.confirmHideButton,
                      (updatingId !== null || hideReason.trim().length < 3) &&
                        styles.disabledButton,
                    ]}
                    onPress={() => handleHide(row)}
                  >
                    {updatingId === row.report.id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmHideText}>Hide report</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}
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

  shortcutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#0F766E",
  },

  shortcutLeft: {
    flex: 1,
  },

  shortcutTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0F172A",
  },

  shortcutText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  shortcutBadge: {
    backgroundColor: "#DC2626",
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  shortcutBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  summaryContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#2563EB",
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginTop: 5,
  },

  seedButton: {
    backgroundColor: "#7C3AED",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 6,
  },

  seedButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
  },

  seedNote: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 6,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 22,
    marginBottom: 12,
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
  },

  category: {
    color: "#0F766E",
    fontWeight: "bold",
    fontSize: 13,
  },

  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 15,
  },

  statusText: {
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

  reportImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 14,
  },

  hiddenInfoBox: {
    backgroundColor: "#F1F5F9",
    padding: 11,
    borderRadius: 9,
    marginTop: 12,
  },

  hiddenInfoText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },

  date: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 10,
  },

  reportId: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 5,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  reviewButton: {
    flex: 1,
    backgroundColor: "#0F766E",
    padding: 13,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  reviewButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  hideToggleButton: {
    flex: 1,
    backgroundColor: "#D97706",
    padding: 13,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  hideToggleButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  restoreButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    padding: 13,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  restoreButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  hideForm: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },

  reasonInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 70,
    textAlignVertical: "top",
  },

  hideFormActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  cancelHideButton: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    padding: 12,
    borderRadius: 9,
    alignItems: "center",
  },

  cancelHideText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },

  confirmHideButton: {
    flex: 1,
    backgroundColor: "#D97706",
    padding: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmHideText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },

  disabledButton: {
    opacity: 0.5,
  },
});

// Protect Admin Reports (admins only)
export default function AdminReportsScreen() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminReportsContent />
    </RoleGuard>
  );
}
