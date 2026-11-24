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

import { Stack, useFocusEffect } from "expo-router";

import RoleGuard from "../../components/auth/RoleGuard";
import { useAuth } from "../../context/AuthContext";

import {
  getSuspensions,
  getEffectiveStatus,
  liftSuspension,
  toActor,
  type Suspension,
  type SuspensionStatus,
} from "../../services/moderationService";

type ListFilter = "Active" | "Lifted" | "Expired" | "All";

// Status badge colors
const STATUS_COLORS: Record<SuspensionStatus, string> = {
  Active: "#DC2626",
  Lifted: "#16A34A",
  Expired: "#64748B",
};

// Pending Suspensions content
function SuspensionsContent() {
  const { user } = useAuth();

  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [filter, setFilter] = useState<ListFilter>("Active");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liftingId, setLiftingId] = useState<string | null>(null);

  // Reload every time the screen becomes active
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          const list = await getSuspensions();

          if (isActive) {
            setSuspensions(list);
          }
        } catch (error) {
          console.error("Error loading suspensions:", error);

          if (isActive) {
            Alert.alert("Error", "Unable to load suspensions.");
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

      setSuspensions(await getSuspensions());
    } finally {
      setRefreshing(false);
    }
  };

  // Count by effective status
  const activeCount = suspensions.filter(
    (item) => getEffectiveStatus(item) === "Active",
  ).length;

  const liftedCount = suspensions.filter(
    (item) => getEffectiveStatus(item) === "Lifted",
  ).length;

  const expiredCount = suspensions.filter(
    (item) => getEffectiveStatus(item) === "Expired",
  ).length;

  // Apply the filter
  const filteredList = suspensions.filter((item) => {
    if (filter === "All") return true;

    return getEffectiveStatus(item) === filter;
  });

  // Lift an active suspension
  const handleLift = (suspension: Suspension) => {
    if (!user) return;

    Alert.alert(
      "Lift Suspension",
      `Lift the suspension for ${suspension.userName}? They will be able to log in again immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Lift",
          onPress: async () => {
            if (liftingId) return;

            setLiftingId(suspension.id);

            try {
              const result = await liftSuspension(suspension.id, toActor(user));

              if (result.success) {
                Alert.alert("Success", result.message);
              } else {
                Alert.alert("Error", result.message);
              }

              await handleRefresh();
            } finally {
              setLiftingId(null);
            }
          },
        },
      ],
    );
  };

  // Human readable end date
  const formatEnd = (suspension: Suspension) => {
    if (suspension.durationDays == null) {
      return "Until an admin lifts it";
    }

    const endsAt =
      new Date(suspension.suspendedAt).getTime() +
      suspension.durationDays * 24 * 3600000;

    return `Ends ${new Date(endsAt).toLocaleString()}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.heading}>User Suspensions</Text>

      <Text style={styles.subtitle}>
        Suspended users cannot log in. Lift a suspension to restore access
        immediately.
      </Text>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: "#FEE2E2" }]}>
          <Text style={[styles.summaryNumber, { color: "#DC2626" }]}>
            {activeCount}
          </Text>

          <Text style={[styles.summaryLabel, { color: "#991B1B" }]}>
            Active
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: "#FEF3C7" }]}>
          <Text style={[styles.summaryNumber, { color: "#D97706" }]}>
            {expiredCount}
          </Text>

          <Text style={[styles.summaryLabel, { color: "#92400E" }]}>
            Expired
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: "#DCFCE7" }]}>
          <Text style={[styles.summaryNumber, { color: "#16A34A" }]}>
            {liftedCount}
          </Text>

          <Text style={[styles.summaryLabel, { color: "#166534" }]}>
            Lifted
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {(["Active", "Expired", "Lifted", "All"] as ListFilter[]).map(
          (item) => (
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
          ),
        )}
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0F766E" />

          <Text style={styles.emptyText}>Loading suspensions...</Text>
        </View>
      ) : filteredList.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Suspensions</Text>

          <Text style={styles.emptyText}>
            There are no suspensions in this category.
          </Text>
        </View>
      ) : (
        /* Suspension Cards */
        filteredList.map((item) => {
          const status = getEffectiveStatus(item);

          return (
            <View key={item.id} style={styles.suspensionCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.userName}>{item.userName}</Text>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[status] },
                  ]}
                >
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              </View>

              <Text style={styles.userEmail}>{item.userEmail}</Text>

              <Text style={styles.reason}>{item.reason}</Text>

              <Text style={styles.meta}>{formatEnd(item)}</Text>

              <Text style={styles.meta}>
                Suspended by {item.suspendedByName} on{" "}
                {new Date(item.suspendedAt).toLocaleString()}
              </Text>

              {item.status === "Lifted" && item.liftedByName ? (
                <Text style={styles.meta}>Lifted by {item.liftedByName}</Text>
              ) : null}

              {status === "Active" ? (
                <Pressable
                  disabled={liftingId !== null}
                  style={[
                    styles.liftButton,
                    liftingId !== null && styles.disabledButton,
                  ]}
                  onPress={() => handleLift(item)}
                >
                  {liftingId === item.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.liftButtonText}>Lift suspension</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        })
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
    marginBottom: 20,
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

  suspensionCard: {
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

  userName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0F172A",
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

  userEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
  },

  reason: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginTop: 10,
  },

  meta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },

  liftButton: {
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  liftButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  disabledButton: {
    opacity: 0.5,
  },
});

// Protect Pending Suspensions (admins only)
export default function SuspensionsScreen() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <Stack.Screen options={{ title: "Pending Suspensions" }} />
      <SuspensionsContent />
    </RoleGuard>
  );
}
