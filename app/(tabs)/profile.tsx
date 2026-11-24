
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import {
  getUserTrustSummary,
  type TrustSummary,
} from "../../services/reportService";

type EditSection = "name" | "email" | "password" | null;

export default function ProfileScreen() {
  const router = useRouter();

  const {
    user,
    isAuthenticated,
    logout,
    updateProfile,
    updateEmail,
    updatePassword,
  } = useAuth();

  const [editSection, setEditSection] = useState<EditSection>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);

  // Trust score states
  const [trustSummary, setTrustSummary] = useState<TrustSummary | null>(null);
  const [trustLoading, setTrustLoading] = useState(false);

  // Refresh trust score whenever Profile screen is opened
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !user || user.role !== "user") {
        setTrustSummary(null);
        setTrustLoading(false);
        return;
      }

      let isActive = true;

      const loadTrustSummary = async () => {
        try {
          setTrustLoading(true);

          const summary = await getUserTrustSummary(user.id);

          if (isActive) {
            setTrustSummary(summary);
          }
        } catch (error) {
          console.error("Failed to load trust summary:", error);

          if (isActive) {
            setTrustSummary(null);
          }
        } finally {
          if (isActive) {
            setTrustLoading(false);
          }
        }
      };

      loadTrustSummary();

      return () => {
        isActive = false;
      };
    }, [user?.id, user?.role, isAuthenticated])
  );

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.center}>
        <Text>Please log in to view your profile.</Text>
      </View>
    );
  }

  // Trust level progress calculation
  const currentScore = trustSummary?.trustScore ?? 0;

  const nextLevelScore =
    currentScore < 30
      ? 30
      : currentScore < 100
      ? 100
      : currentScore < 200
      ? 200
      : null;

  const previousLevelScore =
    currentScore < 30
      ? 0
      : currentScore < 100
      ? 30
      : currentScore < 200
      ? 100
      : 200;

  const pointsRemaining =
    nextLevelScore === null
      ? 0
      : nextLevelScore - currentScore;

  const progress =
    nextLevelScore === null
      ? 1
      : Math.min(
          1,
          Math.max(
            0,
            (currentScore - previousLevelScore) /
              (nextLevelScore - previousLevelScore)
          )
        );

  // Close editor and reset fields
  const closeEditor = () => {
    setEditSection(null);
    setName(user.name);
    setEmail(user.email);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Update name
  const handleNameUpdate = async () => {
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      Alert.alert(
        "Invalid Name",
        "Name must contain at least 2 characters."
      );
      return;
    }

    try {
      setSaving(true);

      await updateProfile({
        ...user,
        name: trimmedName,
      });

      Alert.alert("Success", "Your name has been updated.");
      closeEditor();
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Could not update your name."
      );
    } finally {
      setSaving(false);
    }
  };

  // Update email
  const handleEmailUpdate = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );
      return;
    }

    try {
      setSaving(true);

      await updateEmail(trimmedEmail);

      Alert.alert("Success", "Your email has been updated.");
      closeEditor();
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Could not update your email."
      );
    } finally {
      setSaving(false);
    }
  };

  // Update password
  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        "Missing Information",
        "Please fill in all password fields."
      );
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        "Weak Password",
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "The new passwords do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        "Invalid Password",
        "Your new password must be different from your current password."
      );
      return;
    }

    try {
      setSaving(true);

      await updatePassword(currentPassword, newPassword);

      Alert.alert("Success", "Your password has been changed.");
      closeEditor();
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Could not update your password."
      );
    } finally {
      setSaving(false);
    }
  };

  // Logout
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/(auth)/login");
          } catch {
            Alert.alert(
              "Error",
              "Could not log out. Please try again."
            );
          }
        },
      },
    ]);
  };

  // Reusable input component
  const renderInput = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    secureTextEntry = false,
    keyboardType: "default" | "email-address" = "default"
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={
          keyboardType === "email-address" ? "none" : "sentences"
        }
        autoCorrect={false}
      />
    </View>
  );

  // Edit profile section
  const renderEditor = () => {
    if (!editSection) return null;

    return (
      <View style={styles.editorCard}>
        <Text style={styles.sectionTitle}>
          {editSection === "name"
            ? "Edit Name"
            : editSection === "email"
            ? "Change Email"
            : "Change Password"}
        </Text>

        {editSection === "name" &&
          renderInput(
            "Full Name",
            name,
            setName,
            "Enter your name"
          )}

        {editSection === "email" &&
          renderInput(
            "Email Address",
            email,
            setEmail,
            "Enter your email",
            false,
            "email-address"
          )}

        {editSection === "password" && (
          <>
            {renderInput(
              "Current Password",
              currentPassword,
              setCurrentPassword,
              "Enter current password",
              true
            )}

            {renderInput(
              "New Password",
              newPassword,
              setNewPassword,
              "Enter new password",
              true
            )}

            {renderInput(
              "Confirm New Password",
              confirmPassword,
              setConfirmPassword,
              "Confirm new password",
              true
            )}

            <Text style={styles.helperText}>
              Password must contain at least 8 characters.
            </Text>
          </>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={closeEditor}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            disabled={saving}
            onPress={
              editSection === "name"
                ? handleNameUpdate
                : editSection === "email"
                ? handleEmailUpdate
                : handlePasswordUpdate
            }
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>My Profile</Text>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user.role.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Account Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Account Information
        </Text>

        <InfoRow label="Full Name" value={user.name} />
        <InfoRow label="Email Address" value={user.email} />
        <InfoRow label="User ID" value={user.id} />
        <InfoRow label="Role" value={user.role} />
      </View>

      {/* Profile Management */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Profile Management
        </Text>

        <ActionRow
          title="Change Name"
          description="Update your display name"
          onPress={() => {
            setName(user.name);
            setEditSection("name");
          }}
        />

        <ActionRow
          title="Change Email"
          description="Update your email address"
          onPress={() => {
            setEmail(user.email);
            setEditSection("email");
          }}
        />

        <ActionRow
          title="Change Password"
          description="Update your account password"
          onPress={() => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setEditSection("password");
          }}
        />
      </View>

      {renderEditor()}

      {/* Trust Score - Regular Users Only */}
      {user.role === "user" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trust Level</Text>

          {trustLoading && !trustSummary ? (
            <ActivityIndicator
              size="small"
              color="#0F766E"
            />
          ) : trustSummary ? (
            <>
              <View style={styles.trustRow}>
                <View style={styles.levelContainer}>
                  <Text style={styles.trustLabel}>
                    Current Level
                  </Text>

                  <Text style={styles.trustValue}>
                    {trustSummary.trustLevel}
                  </Text>
                </View>

                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreNumber}>
                    {trustSummary.trustScore}
                  </Text>

                  <Text style={styles.scoreLabel}>
                    Trust Score
                  </Text>
                </View>
              </View>

              {/* Report Statistics */}
              <View style={styles.trustStats}>
                <Text style={styles.trustStat}>
                  Total Reports: {trustSummary.totalReports}
                </Text>

                <Text style={styles.trustStat}>
                  Verified Reports: {trustSummary.verifiedReports}
                </Text>

                <Text style={styles.trustStat}>
                  Rejected Reports: {trustSummary.rejectedReports}
                </Text>

                <Text style={styles.trustStat}>
                  Pending Reports: {trustSummary.pendingReports}
                </Text>
              </View>

              {/* Trust Level Progress */}
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>
                  Trust Level Progress
                </Text>

                {nextLevelScore !== null ? (
                  <>
                    <Text style={styles.progressText}>
                      {pointsRemaining} more{" "}
                      {pointsRemaining === 1 ? "point" : "points"}{" "}
                      to reach the next level
                    </Text>

                    <View
                      style={styles.progressBackground}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress * 100}%`,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.progressTarget}>
                      Next target: {nextLevelScore} points
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.progressText}>
                      Congratulations! You have reached Expert Contributor.
                    </Text>

                    <View
                      style={styles.progressBackground}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          { width: "100%" },
                        ]}
                      />
                    </View>

                    <Text style={styles.progressTarget}>
                      Maximum trust level achieved
                    </Text>
                  </>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.errorText}>
              Unable to load your trust summary. Please reopen your profile.
            </Text>
          )}
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Account information row
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// Profile action row
function ActionRow({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionRow}
      onPress={onPress}
    >
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>
          {description}
        </Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 20,
  },

  profileHeader: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    marginBottom: 18,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
  },

  profileName: {
    fontSize: 21,
    fontWeight: "700",
    color: "#0F172A",
  },

  profileEmail: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 5,
  },

  roleBadge: {
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },

  roleText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },

  editorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#99F6E4",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  infoLabel: {
    fontSize: 14,
    color: "#64748B",
    flex: 1,
  },

  infoValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  actionTextContainer: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },

  actionDescription: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  arrow: {
    fontSize: 26,
    color: "#64748B",
    marginLeft: 10,
  },

  inputGroup: {
    marginBottom: 14,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 7,
  },

  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },

  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  cancelButton: {
    flex: 1,
    padding: 13,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#334155",
    fontWeight: "600",
  },

  saveButton: {
    flex: 1,
    padding: 13,
    borderRadius: 10,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  trustRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  levelContainer: {
    flex: 1,
    paddingRight: 10,
  },

  trustLabel: {
    color: "#64748B",
    fontSize: 13,
  },

  trustValue: {
    color: "#0F766E",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 5,
  },

  scoreContainer: {
    alignItems: "center",
  },

  scoreNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F766E",
  },

  scoreLabel: {
    fontSize: 12,
    color: "#64748B",
  },

  trustStats: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 8,
  },

  trustStat: {
    fontSize: 13,
    color: "#475569",
  },

  progressSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  progressTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },

  progressText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 10,
  },

  progressBackground: {
    height: 10,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#0F766E",
    borderRadius: 10,
  },

  progressTarget: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 7,
  },

  errorText: {
    fontSize: 13,
    color: "#DC2626",
  },

  logoutButton: {
    backgroundColor: "#DC2626",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },

  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
