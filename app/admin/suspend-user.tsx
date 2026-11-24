import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import RoleGuard from "../../components/auth/RoleGuard";
import { useAuth } from "../../context/AuthContext";

import {
  suspendUser,
  toActor,
  type ModerationResult,
} from "../../services/moderationService";

// Duration options for the suspension
type DurationOption = {
  days: number | null;
  label: string;
};

const DURATIONS: DurationOption[] = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: null, label: "Until lifted" },
];

// Suspend User content
function SuspendUserContent() {
  const router = useRouter();
  const { user } = useAuth();

  // Target user passed from the Users screen or the review screen
  const params = useLocalSearchParams<{
    userId: string;
    name: string;
    email: string;
    role: string;
  }>();

  const target = {
    id: String(params.userId ?? ""),
    name: String(params.name ?? ""),
    email: String(params.email ?? ""),
    role: String(params.role ?? "user") as "user" | "moderator" | "admin",
  };

  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState<number | null>(7);
  const [submitting, setSubmitting] = useState(false);

  // Show the suspension confirmation and submit it
  const handleSuspend = () => {
    if (!user) return;

    Alert.alert(
      "Suspend User",
      `Suspend ${target.name} for ${
        DURATIONS.find((option) => option.days === durationDays)?.label ??
        "an unknown period"
      }?\n\nThey will not be able to log in until the suspension ends or is lifted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            if (submitting) return;

            setSubmitting(true);

            try {
              const result: ModerationResult = await suspendUser(
                target,
                toActor(user),
                reason,
                durationDays,
              );

              if (result.success) {
                Alert.alert("Success", result.message, [
                  {
                    text: "OK",
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                Alert.alert("Error", result.message);
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Suspend User" }} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Target user summary */}
        <View style={styles.targetBox}>
          <Text style={styles.targetLabel}>Suspending</Text>

          <Text style={styles.targetName}>{target.name}</Text>

          <Text style={styles.targetEmail}>{target.email}</Text>

          <Text style={styles.targetRole}>Role: {target.role}</Text>

          {target.role === "admin" ? (
            <Text style={styles.adminWarning}>
              Admin accounts cannot be suspended.
            </Text>
          ) : null}
        </View>

        {/* Reason */}
        <Text style={styles.label}>
          Reason <Text style={styles.required}>*</Text>
        </Text>

        <TextInput
          style={styles.reasonInput}
          value={reason}
          onChangeText={setReason}
          placeholder="Why is this user being suspended?"
          placeholderTextColor="#94A3B8"
          multiline
        />

        <Text style={styles.hint}>
          The reason is shown to the user on the login screen and written to the
          audit log.
        </Text>

        {/* Duration */}
        <Text style={styles.label}>Duration</Text>

        <View style={styles.durationContainer}>
          {DURATIONS.map((option) => (
            <Pressable
              key={option.label}
              style={[
                styles.durationChip,
                durationDays === option.days && styles.durationChipActive,
              ]}
              onPress={() => setDurationDays(option.days)}
            >
              <Text
                style={[
                  styles.durationChipText,
                  durationDays === option.days && styles.durationChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Submit */}
        <Pressable
          disabled={
            submitting || target.role === "admin" || reason.trim().length < 3
          }
          style={[
            styles.suspendButton,
            (submitting ||
              target.role === "admin" ||
              reason.trim().length < 3) &&
              styles.disabledButton,
          ]}
          onPress={handleSuspend}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.suspendButtonText}>Suspend user</Text>
          )}
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles
const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  targetBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
  },

  targetLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748B",
  },

  targetName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 6,
  },

  targetEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  targetRole: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },

  adminWarning: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
    marginTop: 10,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginTop: 22,
    marginBottom: 8,
  },

  required: {
    color: "#DC2626",
  },

  reasonInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 90,
    textAlignVertical: "top",
  },

  hint: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginTop: 8,
  },

  durationContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  durationChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  durationChipActive: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },

  durationChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  durationChipTextActive: {
    color: "#FFFFFF",
  },

  suspendButton: {
    backgroundColor: "#DC2626",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },

  suspendButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  cancelButton: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },

  cancelButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 15,
  },

  disabledButton: {
    opacity: 0.5,
  },
});

// Protect Suspend User (admins only)
export default function SuspendUserScreen() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <SuspendUserContent />
    </RoleGuard>
  );
}
