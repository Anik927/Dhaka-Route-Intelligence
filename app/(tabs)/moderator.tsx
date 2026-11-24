
import { useCallback, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";

import { useFocusEffect } from "expo-router";

import RoleGuard from "../../components/auth/RoleGuard";

import {
  getReports,
  updateReportStatus,
  type RoadReport,
} from "../../services/reportService";

type FilterType = "All" | "Pending" | "Verified" | "Rejected";

// Main Moderator Dashboard
function ModeratorContent() {
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [filter, setFilter] = useState<FilterType>("All");

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(
    null
  );

  // Load all reports from AsyncStorage
  const loadReports = useCallback(async () => {
    try {
      const allReports = await getReports();

      const sortedReports = [...allReports].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      setReports(sortedReports);
    } catch (error) {
      console.error("Error loading reports:", error);
      Alert.alert("Error", "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load reports whenever the screen becomes active
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchReports = async () => {
        try {
          const allReports = await getReports();

          const sortedReports = [...allReports].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );

          if (isActive) {
            setReports(sortedReports);
          }
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

      fetchReports();

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Refresh reports
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadReports();
    } finally {
      setRefreshing(false);
    }
  };

  // Change report status
  const handleStatusUpdate = (
    reportId: string,
    status: "Verified" | "Rejected"
  ) => {
    const scoreMessage =
      status === "Verified"
        ? "The report contributor will receive +5 Trust Score points."
        : "The report contributor's Trust Score will decrease by 5 points, subject to the minimum score of 0.";

    Alert.alert(
      `${status} Report`,
      `Are you sure you want to ${status.toLowerCase()} this report?\n\n${scoreMessage}`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: async () => {
            if (updatingReportId) return;

            try {
              setUpdatingReportId(reportId);

              const success = await updateReportStatus(
                reportId,
                status
              );

              if (success) {
                await loadReports();

                Alert.alert(
                  "Success",
                  `Report has been ${status.toLowerCase()} successfully.\n\nThe contributor's Trust Score will reflect this status change.`
                );
              } else {
                Alert.alert(
                  "Error",
                  "Unable to update this report. It may have already been changed."
                );
              }
            } catch (error) {
              console.error("Status update error:", error);

              Alert.alert(
                "Error",
                "Unable to update report. Please try again."
              );
            } finally {
              setUpdatingReportId(null);
            }
          },
        },
      ]
    );
  };

  // Filter reports
  const filteredReports =
    filter === "All"
      ? reports
      : reports.filter((report) => report.status === filter);

  // Count reports by status
  const pendingCount = reports.filter(
    (report) => report.status === "Pending"
  ).length;

  const verifiedCount = reports.filter(
    (report) => report.status === "Verified"
  ).length;

  const rejectedCount = reports.filter(
    (report) => report.status === "Rejected"
  ).length;

  // Status color
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

  // Format submission date
  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      <Text style={styles.heading}>
        Moderator Dashboard
      </Text>

      <Text style={styles.subtitle}>
        Review and manage student-submitted road reports.
      </Text>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {reports.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Total
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: "#FEF3C7" },
          ]}
        >
          <Text
            style={[
              styles.summaryNumber,
              { color: "#D97706" },
            ]}
          >
            {pendingCount}
          </Text>

          <Text
            style={[
              styles.summaryLabel,
              { color: "#92400E" },
            ]}
          >
            Pending
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: "#DCFCE7" },
          ]}
        >
          <Text
            style={[
              styles.summaryNumber,
              { color: "#16A34A" },
            ]}
          >
            {verifiedCount}
          </Text>

          <Text
            style={[
              styles.summaryLabel,
              { color: "#166534" },
            ]}
          >
            Verified
          </Text>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: "#FEE2E2" },
          ]}
        >
          <Text
            style={[
              styles.summaryNumber,
              { color: "#DC2626" },
            ]}
          >
            {rejectedCount}
          </Text>

          <Text
            style={[
              styles.summaryLabel,
              { color: "#991B1B" },
            ]}
          >
            Rejected
          </Text>
        </View>
      </View>

      {/* Trust Score Information */}
      <View style={styles.trustInfo}>
        <Text style={styles.trustTitle}>
          Contributor Trust Score
        </Text>

        <Text style={styles.trustDescription}>
          Verified reports award +5 points. Rejected reports
          deduct 5 points. Pending reports do not affect the score.
        </Text>
      </View>

      {/* Filters */}
      <Text style={styles.sectionTitle}>
        Report Management
      </Text>

      <View style={styles.filterContainer}>
        {(
          ["All", "Pending", "Verified", "Rejected"] as FilterType[]
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

          <Text style={styles.emptyText}>
            Loading reports...
          </Text>
        </View>
      ) : filteredReports.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No Reports Found
          </Text>

          <Text style={styles.emptyText}>
            There are no reports in this category yet.
          </Text>
        </View>
      ) : (
        /* Report List */
        filteredReports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.category}>
                {report.category}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(
                      report.status
                    ),
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {report.status}
                </Text>
              </View>
            </View>

            <Text style={styles.reportTitle}>
              {report.title}
            </Text>

            <Text style={styles.description}>
              {report.description}
            </Text>

            <Text style={styles.userName}>
              Submitted by: {report.userName}
            </Text>

            {report.imageUri ? (
              <Image
                source={{ uri: report.imageUri }}
                style={styles.reportImage}
                resizeMode="cover"
              />
            ) : null}

            {report.latitude != null &&
              report.longitude != null && (
                <View style={styles.locationContainer}>
                  <Text style={styles.locationLabel}>
                    GPS Location
                  </Text>

                  <Text style={styles.location}>
                    {report.latitude.toFixed(5)},{" "}
                    {report.longitude.toFixed(5)}
                  </Text>
                </View>
              )}

            <Text style={styles.date}>
              Submitted: {formatDate(report.createdAt)}
            </Text>

            <Text style={styles.reportId}>
              Report ID: {report.id}
            </Text>

            {/* Action Buttons */}
            {report.status === "Pending" && (
              <View style={styles.actionContainer}>
                <Pressable
                  disabled={updatingReportId !== null}
                  style={[
                    styles.verifyButton,
                    updatingReportId !== null &&
                      styles.disabledButton,
                  ]}
                  onPress={() =>
                    handleStatusUpdate(report.id, "Verified")
                  }
                >
                  {updatingReportId === report.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionText}>
                      Verify (+5)
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  disabled={updatingReportId !== null}
                  style={[
                    styles.rejectButton,
                    updatingReportId !== null &&
                      styles.disabledButton,
                  ]}
                  onPress={() =>
                    handleStatusUpdate(report.id, "Rejected")
                  }
                >
                  <Text style={styles.actionText}>
                    Reject (-5)
                  </Text>
                </Pressable>
              </View>
            )}
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

  trustInfo: {
    backgroundColor: "#CCFBF1",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },

  trustTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#115E59",
  },

  trustDescription: {
    fontSize: 12,
    color: "#134E4A",
    lineHeight: 19,
    marginTop: 6,
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

  locationContainer: {
    backgroundColor: "#EFF6FF",
    padding: 11,
    borderRadius: 9,
    marginTop: 12,
  },

  locationLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 4,
  },

  location: {
    fontSize: 12,
    color: "#2563EB",
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

  actionContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  verifyButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    padding: 13,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  rejectButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    padding: 13,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  actionText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});

// Protect Moderator Dashboard
export default function ModeratorScreen() {
  return (
    <RoleGuard allowedRoles={["moderator"]}>
      <ModeratorContent />
    </RoleGuard>
  );
}
