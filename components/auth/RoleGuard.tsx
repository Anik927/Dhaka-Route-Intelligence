
import { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../services/authService";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export default function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth();

  // Check authentication
  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Check user's role
  if (!allowedRoles.includes(user.role)) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Access Denied</Text>

        <Text style={styles.message}>
          You do not have permission to access this screen.
        </Text>

        <Text style={styles.role}>
          Your role: {user.role}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    backgroundColor: "#F1F5F9",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#DC2626",
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
  role: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F766E",
    marginTop: 15,
  },
});
