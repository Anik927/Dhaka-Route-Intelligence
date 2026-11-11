
import { useCallback, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";

import { useFocusEffect } from "expo-router";

import { useAuth } from "../../context/AuthContext";

import {
  getUserReports,
  type RoadReport,
} from "../../services/reportService";

import RoleGuard from "../../components/auth/RoleGuard";

// Main My Reports screen
function MyReportsContent() {
  const { user } = useAuth();

  const [reports, setReports] = useState<RoadReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load reports from AsyncStorage
  const loadReports = useCallback(async () => {
    try {
      if (!user) {
        setReports([]);
        return;
      }

      const userReports = await getUserReports(user.id);

      // Display newest reports first
      const sortedReports = [...userReports].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      setReports(sortedReports);
    } catch (error) {
      console.error("Error loading user reports:", error);
      Alert.alert("Error", "Unable to load your reports.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload whenever screen becomes active
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchReports = async () => {
        try {
          if (!user) {
            setReports([]);
            return;
          }

          const userReports = await getUserReports(user.id);

          const sortedReports = [...userReports].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );

          if (isActive) {
            setReports(sortedReports);
          }
        } catch (error) {
          console.error("Error loading user reports:", error);

          if (isActive) {
            Alert.alert("Error", "Unable to load your reports.");
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
    }, [user])
  );

  // Refresh reports manually
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadReports();
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate report statistics
  const totalReports = reports.length;

  const verifiedReports = reports.filter(
    (report) => report.status === "Verified"
  ).length;

  const pendingReports = reports.filter(
    (report) => report.status === "Pending"
  ).length;

  const rejectedReports = reports.filter(
    (report) => report.status === "Rejected"
  ).length;

  // Choose status color
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
      <Text style={styles.heading}>My Reports</Text>

      <Text style={styles.subtitle}>
        View and track the road problems you have reported.
      </Text>

      {/* Total Reports */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>
          {totalReports}
        </Text>

        <Text style={styles.summaryLabel}>
          Total Reports Submitted
        </Text>
      </View>

      {/* Report Status Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#16A34A" }]}>
            {verifiedReports}
          </Text>

          <Text style={styles.statLabel}>Verified</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#D97706" }]}>
            {pendingReports}
          </Text>

          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#DC2626" }]}>
            {rejectedReports}
          </Text>

          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0F766E" />

          <Text style={styles.emptyText}>
            Loading your reports...
          </Text>
        </View>
      ) : reports.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No Reports Yet
          </Text>

          <Text style={styles.emptyText}>
            You have not submitted any road reports.
            Your submitted reports will appear here.
          </Text>
        </View>
      ) : (
        /* Report List */
        reports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            {/* Category and Status */}
            <View style={styles.cardHeader}>
              <Text style={styles.category}>
                {report.category}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(report.status),
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {report.status}
                </Text>
              </View>
            </View>

            {/* Report Title */}
            <Text style={styles.reportTitle}>
              {report.title}
            </Text>

            {/* Description */}
            <Text style={styles.description}>
              {report.description}
            </Text>

            {/* Report Image */}
            {report.imageUri ? (
              <Image
                source={{ uri: report.imageUri }}
                style={styles.reportImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImage}>
                <Text style={styles.noImageText}>
                  No image attached
                </Text>
              </View>
            )}

            {/* GPS Location */}
            {report.latitude != null &&
              report.longitude != null && (
                <View style={styles.locationContainer}>
                  <Text style={styles.infoLabel}>
                    GPS Location
                  </Text>

                  <Text style={styles.location}>
                    Latitude: {report.latitude.toFixed(5)}
                  </Text>

                  <Text style={styles.location}>
                    Longitude: {report.longitude.toFixed(5)}
                  </Text>
                </View>
              )}

            <View style={styles.separator} />

            {/* Submission Date */}
            <Text style={styles.date}>
              Submitted: {formatDate(report.createdAt)}
            </Text>

            {/* Report ID */}
            <Text style={styles.reportId}>
              Report ID: {report.id}
            </Text>
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
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 20,
  },

  summaryCard: {
    backgroundColor: "#0F766E",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    marginBottom: 15,
  },

  summaryNumber: {
    fontSize: 35,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  summaryLabel: {
    fontSize: 14,
    color: "#CCFBF1",
    marginTop: 5,
  },

  statsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 25,
    fontWeight: "bold",
  },

  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 5,
  },

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    marginTop: 10,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
  },

  emptyText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
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

  reportImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 14,
  },

  noImage: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 18,
    alignItems: "center",
    marginTop: 14,
  },

  noImageText: {
    color: "#94A3B8",
    fontSize: 12,
  },

  locationContainer: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 9,
    marginTop: 12,
  },

  infoLabel: {
    color: "#1D4ED8",
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 5,
  },

  location: {
    fontSize: 12,
    color: "#2563EB",
    marginTop: 3,
  },

  separator: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },

  date: {
    fontSize: 12,
    color: "#64748B",
  },

  reportId: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 5,
  },
});

// Protect the entire My Reports screen
export default function MyReportsScreen() {
  return (
    <RoleGuard allowedRoles={["user"]}>
      <MyReportsContent />
    </RoleGuard>
  );
}
