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

import { useFocusEffect, useRouter } from "expo-router";

import RoleGuard from "../../components/auth/RoleGuard";
import { useAuth } from "../../context/AuthContext";

import { type DemoUser } from "../../services/authService";
import { getAllUsers } from "../../services/moderationUserStore";
import {
  changeUserRole,
  getEffectiveStatus,
  getSuspensions,
  toActor,
  type Suspension,
} from "../../services/moderationService";

// Role badge colors
const ROLE_COLORS: Record<DemoUser["role"], string> = {
  user: "#2563EB",
  moderator: "#D97706",
  admin: "#0F766E",
};

// Admin Users content
function AdminUsersContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [users, setUsers] = useState<DemoUser[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load users and suspensions every time the screen becomes active
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          const [allUsers, allSuspensions] = await Promise.all([
            getAllUsers(),
            getSuspensions(),
          ]);

          if (isActive) {
            setUsers(allUsers);
            setSuspensions(allSuspensions);
          }
        } catch (error) {
          console.error("Error loading users:", error);

          if (isActive) {
            Alert.alert("Error", "Unable to load users.");
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

      const [allUsers, allSuspensions] = await Promise.all([
        getAllUsers(),
        getSuspensions(),
      ]);

      setUsers(allUsers);
      setSuspensions(allSuspensions);
    } finally {
      setRefreshing(false);
    }
  };

  // Suspensions that are currently being served
  const activeSuspensionByUser = new Map<string, Suspension>();

  for (const suspension of suspensions) {
    if (getEffectiveStatus(suspension) === "Active") {
      activeSuspensionByUser.set(suspension.userId, suspension);
    }
  }

  const activeSuspensionCount = activeSuspensionByUser.size;

  // Open the role picker for a user
  const openRolePicker = (target: DemoUser) => {
    if (!user) return;

    Alert.alert("Change Role", `Choose the new role for ${target.name}.`, [
      {
        text: target.role === "user" ? "User (current)" : "User",
        onPress: () => applyRole(target, "user"),
      },
      {
        text: target.role === "moderator" ? "Moderator (current)" : "Moderator",
        onPress: () => applyRole(target, "moderator"),
      },
      {
        text: target.role === "admin" ? "Admin (current)" : "Admin",
        onPress: () => applyRole(target, "admin"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Apply a role change and refresh the list
  const applyRole = async (target: DemoUser, newRole: DemoUser["role"]) => {
    if (!user || target.role === newRole) return;

    try {
      const result = await changeUserRole(
        { id: target.id, name: target.name },
        newRole,
        toActor(user),
      );

      if (result.success) {
        Alert.alert("Success", result.message);

        await handleRefresh();
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      console.error("Role change error:", error);

      Alert.alert("Error", "Unable to change the role. Please try again.");
    }
  };

  const openSuspend = (target: DemoUser) => {
    router.push({
      pathname: "/admin/suspend-user",
      params: {
        userId: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
      },
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
      <Text style={styles.heading}>Users</Text>

      <Text style={styles.subtitle}>
        Manage registered accounts, their roles, and suspensions.
      </Text>

      {/* Shortcut: Pending Suspensions */}
      <Pressable
        style={styles.shortcutCard}
        onPress={() => router.push("/admin/suspensions")}
      >
        <View style={styles.shortcutLeft}>
          <Text style={styles.shortcutTitle}>Pending Suspensions</Text>

          <Text style={styles.shortcutText}>
            Review and lift active suspensions.
          </Text>
        </View>

        <View style={styles.shortcutBadge}>
          <Text style={styles.shortcutBadgeText}>{activeSuspensionCount}</Text>
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

      {/* Loading State */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0F766E" />

          <Text style={styles.emptyText}>Loading users...</Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Users Found</Text>

          <Text style={styles.emptyText}>
            Registered accounts will appear here.
          </Text>
        </View>
      ) : (
        /* User Cards */
        users.map((item) => {
          const isSelf = item.id === user?.id;
          const suspension = activeSuspensionByUser.get(item.id);

          return (
            <View key={item.id} style={styles.userCard}>
              <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{item.name}</Text>

                  {isSelf ? (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: ROLE_COLORS[item.role] },
                  ]}
                >
                  <Text style={styles.roleBadgeText}>{item.role}</Text>
                </View>
              </View>

              <Text style={styles.userEmail}>{item.email}</Text>

              {suspension ? (
                <View style={styles.suspendedBox}>
                  <Text style={styles.suspendedText}>
                    Suspended: {suspension.reason}
                  </Text>
                </View>
              ) : null}

              {/* Actions */}
              <View style={styles.actionRow}>
                {!isSelf ? (
                  <Pressable
                    style={styles.roleButton}
                    onPress={() => openRolePicker(item)}
                  >
                    <Text style={styles.roleButtonText}>Change role</Text>
                  </Pressable>
                ) : null}

                {suspension ? (
                  <Pressable
                    style={styles.viewSuspensionButton}
                    onPress={() => router.push("/admin/suspensions")}
                  >
                    <Text style={styles.viewSuspensionButtonText}>
                      View suspension
                    </Text>
                  </Pressable>
                ) : !isSelf && item.role !== "admin" ? (
                  <Pressable
                    style={styles.suspendButton}
                    onPress={() => openSuspend(item)}
                  >
                    <Text style={styles.suspendButtonText}>Suspend</Text>
                  </Pressable>
                ) : null}
              </View>
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

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    marginTop: 8,
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

  userCard: {
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

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },

  userName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0F172A",
  },

  youBadge: {
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  youBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#115E59",
  },

  roleBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 15,
  },

  roleBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 11,
    textTransform: "capitalize",
  },

  userEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
  },

  suspendedBox: {
    backgroundColor: "#FEE2E2",
    padding: 11,
    borderRadius: 9,
    marginTop: 12,
  },

  suspendedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#991B1B",
    lineHeight: 18,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },

  roleButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  roleButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },

  suspendButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    padding: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  suspendButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },

  viewSuspensionButton: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    padding: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  viewSuspensionButtonText: {
    color: "#334155",
    fontWeight: "bold",
    fontSize: 13,
  },
});

// Protect Users screen (admins only)
export default function AdminUsersScreen() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminUsersContent />
    </RoleGuard>
  );
}
