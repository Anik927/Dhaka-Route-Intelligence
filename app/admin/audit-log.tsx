import { useCallback, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";

import { Stack, useFocusEffect } from "expo-router";

import RoleGuard from "../../components/auth/RoleGuard";

import {
  getAuditLog,
  type AuditAction,
  type AuditEntry,
  type AuditTargetType,
} from "../../services/moderationService";

type LogFilter = "All" | AuditTargetType;

// Action label and badge color
const ACTION_META: Record<AuditAction, { label: string; color: string }> = {
  VERIFY_REPORT: { label: "Report verified", color: "#16A34A" },
  REJECT_REPORT: { label: "Report rejected", color: "#DC2626" },
  HIDE_REPORT: { label: "Report hidden", color: "#D97706" },
  RESTORE_REPORT: { label: "Report restored", color: "#2563EB" },
  SUSPEND_USER: { label: "User suspended", color: "#B91C1C" },
  LIFT_SUSPENSION: { label: "Suspension lifted", color: "#0284C7" },
  CHANGE_ROLE: { label: "Role changed", color: "#7C3AED" },
  SEED_DATA: { label: "Seed data", color: "#64748B" },
};

const TARGET_FILTERS: { key: LogFilter; label: string }[] = [
  { key: "All", label: "All" },
  { key: "report", label: "Reports" },
  { key: "user", label: "Users" },
  { key: "system", label: "System" },
];

// Audit Log content
function AuditLogContent() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload every time the screen becomes active
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          const log = await getAuditLog();

          if (isActive) {
            setEntries(log);
          }
        } catch (error) {
          console.error("Error loading audit log:", error);

          if (isActive) {
            Alert.alert("Error", "Unable to load the audit log.");
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

      setEntries(await getAuditLog());
    } finally {
      setRefreshing(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (filter === "All") return true;

    return entry.targetType === filter;
  });

  const renderEntry = ({ item }: { item: AuditEntry }) => {
    const meta = ACTION_META[item.action];

    return (
      <View style={styles.entryCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.actionBadge, { backgroundColor: meta.color }]}>
            <Text style={styles.actionBadgeText}>{meta.label}</Text>
          </View>

          <Text style={styles.time}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        <Text style={styles.details}>{item.details}</Text>

        <Text style={styles.target}>
          Target: {item.targetLabel} ({item.targetId})
        </Text>

        <Text style={styles.actor}>
          By {item.actorName} ({item.actorRole})
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Audit Log" }} />

      <View style={styles.headerArea}>
        <Text style={styles.heading}>Audit Log</Text>

        <Text style={styles.subtitle}>
          Every moderation action is recorded here: who did what, when, and to
          which report or user.
        </Text>

        <View style={styles.filterContainer}>
          {TARGET_FILTERS.map((item) => (
            <Pressable
              key={item.key}
              style={[
                styles.filterButton,
                filter === item.key && styles.activeFilter,
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item.key && styles.activeFilterText,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0F766E" />

          <Text style={styles.emptyText}>Loading audit log...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Nothing Logged Yet</Text>

              <Text style={styles.emptyText}>
                Moderation actions will appear here as they happen.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  headerArea: {
    padding: 20,
    paddingBottom: 0,
  },

  listContent: {
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
    marginBottom: 18,
    lineHeight: 21,
  },

  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
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

  entryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  actionBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 15,
  },

  actionBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 11,
  },

  time: {
    fontSize: 11,
    color: "#94A3B8",
  },

  details: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginTop: 12,
  },

  target: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
  },

  actor: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 6,
  },

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    marginTop: 16,
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
});

// Protect Audit Log (admins only)
export default function AuditLogScreen() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AuditLogContent />
    </RoleGuard>
  );
}
