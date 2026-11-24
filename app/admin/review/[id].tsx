import React, { useCallback, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import RoleGuard from "../../../components/auth/RoleGuard";
import RoadMap from "../../../components/map/RoadMap";
import { useAuth } from "../../../context/AuthContext";

import {
  getModerationReport,
  hideReport,
  restoreReport,
  setReportStatus,
  toActor,
  type ModerationReport,
} from "../../../services/moderationService";
import type { CommunityReport } from "../../../services/communityService";
import type { Coords } from "../../../utils/helpers";

// Review Report content
function ReviewReportContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState<ModerationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [updating, setUpdating] = useState(false);
  const [hideReason, setHideReason] = useState("");

  const isAdmin = user?.role === "admin";

  // Load the report (including hidden ones) every time the screen activates
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          const result = await getModerationReport(String(id));

          if (isActive) {
            if (!result) {
              setError("This report no longer exists.");
            }

            setData(result);
          }
        } catch (err) {
          console.error("Error loading report:", err);

          if (isActive) {
            setError("Unable to load this report.");
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
    }, [id]),
  );

  // Verify or reject the report (trust score follows the team's +/-5 rule)
  const handleStatus = (status: "Verified" | "Rejected") => {
    if (!data || !user) return;

    const scoreMessage =
      status === "Verified"
        ? "The report contributor will receive +5 Trust Score points."
        : "The report contributor's Trust Score will decrease by 5 points, subject to the minimum score of 0.";

    Alert.alert(
      `${status} Report`,
      `Are you sure you want to ${status.toLowerCase()} this report?\n\n${scoreMessage}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            if (updating) return;

            setUpdating(true);

            try {
              const result = await setReportStatus(
                data.report.id,
                data.report.title,
                status,
                toActor(user),
              );

              if (result.success) {
                Alert.alert("Success", result.message);
              } else {
                Alert.alert("Error", result.message);
              }
            } catch (err) {
              console.error("Status update error:", err);

              Alert.alert(
                "Error",
                "Unable to update the report. Please try again.",
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  // Hide the report with the reason from the input
  const handleHide = async () => {
    if (!data || !user) return;

    setUpdating(true);

    try {
      const result = await hideReport(
        data.report.id,
        data.report.title,
        toActor(user),
        hideReason,
      );

      if (result.success) {
        setHideReason("");

        Alert.alert("Success", result.message);
      } else {
        Alert.alert("Error", result.message);
      }
    } finally {
      setUpdating(false);
    }
  };

  // Bring a hidden report back to the map and feed
  const handleRestore = async () => {
    if (!data || !user) return;

    setUpdating(true);

    try {
      const result = await restoreReport(
        data.report.id,
        data.report.title,
        toActor(user),
      );

      if (result.success) {
        Alert.alert("Success", result.message);
      } else {
        Alert.alert("Error", result.message);
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading || error || !data) {
    return (
      <View style={styles.stateContainer}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#0F766E" />

            <Text style={styles.stateText}>Loading report...</Text>
          </>
        ) : (
          <Text style={styles.errorText}>{error ?? "Report not found."}</Text>
        )}
      </View>
    );
  }

  const { report, moderation, confirms, clears, spams, reporter } = data;

  // Map marker needs a CommunityReport-shaped object
  const canShowMap = report.latitude != null && report.longitude != null;

  const mapReport: CommunityReport | null = canShowMap
    ? {
        ...report,
        latitude: report.latitude as number,
        longitude: report.longitude as number,
        source: "user",
        confirms,
        clears,
        spams,
        myVote: null,
        communityStatus: "Active",
        expiresAt: null,
      }
    : null;

  const mapCenter: Coords | null = canShowMap
    ? {
        latitude: report.latitude as number,
        longitude: report.longitude as number,
      }
    : null;

  const reporterCanSuspend =
    isAdmin &&
    reporter !== null &&
    reporter.id !== user?.id &&
    reporter.role !== "admin";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {report.imageUri ? (
        <Image
          source={{ uri: report.imageUri }}
          style={styles.reportImage}
          resizeMode="cover"
        />
      ) : null}

      {/* Header badges */}
      <View style={styles.badgeRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{report.category}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                report.status === "Verified"
                  ? "#16A34A"
                  : report.status === "Rejected"
                    ? "#DC2626"
                    : "#D97706",
            },
          ]}
        >
          <Text style={styles.statusText}>{report.status}</Text>
        </View>

        {moderation.hidden ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Hidden</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.reportTitle}>{report.title}</Text>

      <Text style={styles.description}>{report.description}</Text>

      {/* Reporter information */}
      <View style={styles.reporterBox}>
        <Text style={styles.reporterLabel}>Reporter</Text>

        <Text style={styles.reporterName}>{report.userName}</Text>

        {reporter ? (
          <Text style={styles.reporterEmail}>
            {reporter.email} | Role: {reporter.role}
          </Text>
        ) : (
          <Text style={styles.reporterEmail}>
            Not a registered account (team seed data)
          </Text>
        )}

        {reporterCanSuspend ? (
          <Pressable
            style={styles.suspendButton}
            onPress={() =>
              router.push({
                pathname: "/admin/suspend-user",
                params: {
                  userId: reporter.id,
                  name: reporter.name,
                  email: reporter.email,
                  role: reporter.role,
                },
              })
            }
          >
            <Text style={styles.actionButtonText}>Suspend this reporter</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Community votes */}
      <View style={styles.voteRow}>
        <Text style={[styles.voteText, { color: "#DC2626" }]}>
          Spam: {spams}
        </Text>

        <Text style={[styles.voteText, { color: "#16A34A" }]}>
          Confirms: {confirms}
        </Text>

        <Text style={[styles.voteText, { color: "#2563EB" }]}>
          Clears: {clears}
        </Text>
      </View>

      {/* Location */}
      {mapCenter && mapReport ? (
        <View style={styles.mapWrapper}>
          <Text style={styles.sectionLabel}>Location</Text>

          <RoadMap
            style={styles.map}
            reports={[mapReport]}
            scrollEnabled={false}
            zoomEnabled={false}
            initialRegion={{
              ...mapCenter,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          />

          <Text style={styles.coordinates}>
            {report.latitude?.toFixed(5)}, {report.longitude?.toFixed(5)}
          </Text>
        </View>
      ) : (
        <View style={styles.noLocationBox}>
          <Text style={styles.noLocationText}>
            No GPS location was attached to this report.
          </Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Moderator Actions</Text>

      {/* Verify / Reject for pending reports */}
      {report.status === "Pending" ? (
        <View style={styles.actionRow}>
          <Pressable
            disabled={updating}
            style={[styles.verifyButton, updating && styles.disabledButton]}
            onPress={() => handleStatus("Verified")}
          >
            <Text style={styles.actionButtonText}>Verify (+5)</Text>
          </Pressable>

          <Pressable
            disabled={updating}
            style={[styles.rejectButton, updating && styles.disabledButton]}
            onPress={() => handleStatus("Rejected")}
          >
            <Text style={styles.actionButtonText}>Reject (-5)</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.statusNote}>
          This report is already {report.status.toLowerCase()}. Only pending
          reports change the contributor&apos;s trust score.
        </Text>
      )}

      {/* Hide / Restore */}
      {moderation.hidden ? (
        <View style={styles.hiddenBox}>
          <Text style={styles.hiddenTitle}>Currently hidden</Text>

          <Text style={styles.hiddenMeta}>Hidden by {moderation.hiddenBy}</Text>

          {moderation.hiddenAt ? (
            <Text style={styles.hiddenMeta}>
              On {new Date(moderation.hiddenAt).toLocaleString()}
            </Text>
          ) : null}

          <Text style={styles.hiddenReason}>Reason: {moderation.reason}</Text>

          <Pressable
            disabled={updating}
            style={[styles.restoreButton, updating && styles.disabledButton]}
            onPress={handleRestore}
          >
            <Text style={styles.actionButtonText}>Restore report</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.hideBox}>
          <Text style={styles.hideLabel}>
            Hide this report from the map and feed
          </Text>

          <TextInput
            style={styles.reasonInput}
            value={hideReason}
            onChangeText={setHideReason}
            placeholder="Reason, for example: fake report, abusive photo"
            placeholderTextColor="#94A3B8"
            multiline
          />

          <Pressable
            disabled={updating}
            style={[
              styles.hideButton,
              (!hideReason.trim() || updating) && styles.disabledButton,
            ]}
            onPress={handleHide}
          >
            <Text style={styles.actionButtonText}>Hide report</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.reportId}>Report ID: {report.id}</Text>
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

  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    backgroundColor: "#F1F5F9",
  },

  stateText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 10,
  },

  errorText: {
    fontSize: 15,
    color: "#DC2626",
    textAlign: "center",
  },

  reportImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  categoryBadge: {
    backgroundColor: "#0F766E",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 15,
  },

  categoryBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 11,
  },

  statusBadge: {
    backgroundColor: "#475569",
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
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 14,
  },

  description: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginTop: 10,
  },

  reporterBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginTop: 16,
  },

  reporterLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748B",
  },

  reporterName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 6,
  },

  reporterEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  suspendButton: {
    backgroundColor: "#B91C1C",
    padding: 12,
    borderRadius: 9,
    alignItems: "center",
    marginTop: 14,
  },

  voteRow: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },

  voteText: {
    fontSize: 13,
    fontWeight: "bold",
  },

  mapWrapper: {
    marginTop: 16,
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 10,
    marginTop: 16,
  },

  map: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    flex: 0,
  },

  coordinates: {
    fontSize: 12,
    color: "#2563EB",
    marginTop: 8,
  },

  noLocationBox: {
    backgroundColor: "#FEF3C7",
    padding: 13,
    borderRadius: 12,
    marginTop: 16,
  },

  noLocationText: {
    fontSize: 13,
    color: "#92400E",
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
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

  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  statusNote: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginTop: 4,
  },

  hideBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginTop: 16,
  },

  hideLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
  },

  reasonInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 70,
    textAlignVertical: "top",
  },

  hideButton: {
    backgroundColor: "#D97706",
    padding: 13,
    borderRadius: 9,
    alignItems: "center",
    marginTop: 12,
  },

  hiddenBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 15,
    marginTop: 16,
  },

  hiddenTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#991B1B",
  },

  hiddenMeta: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 4,
  },

  hiddenReason: {
    fontSize: 13,
    color: "#991B1B",
    marginTop: 8,
    lineHeight: 19,
  },

  restoreButton: {
    backgroundColor: "#2563EB",
    padding: 13,
    borderRadius: 9,
    alignItems: "center",
    marginTop: 14,
  },

  disabledButton: {
    opacity: 0.5,
  },

  reportId: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 18,
  },
});

// Protect Review Report (moderators and admins)
export default function ReviewReportScreen() {
  return (
    <RoleGuard allowedRoles={["moderator", "admin"]}>
      <Stack.Screen options={{ title: "Review Report" }} />
      <ReviewReportContent />
    </RoleGuard>
  );
}
