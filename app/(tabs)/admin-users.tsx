
import { View, Text, StyleSheet } from "react-native";
import RoleGuard from "../../components/auth/RoleGuard";

export default function AdminUsersScreen() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <View style={styles.container}>
        <Text style={styles.title}>
          Admin Users Dashboard
        </Text>

        <Text style={styles.subtitle}>
          Manage registered users and their roles.
        </Text>
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F1F5F9",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F766E",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
});
