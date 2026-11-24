
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";

import { useAuth } from "../../context/AuthContext";

export default function HomeScreen() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Please Login</Text>
      </View>
    );
  }

  // Role-based dashboard content
  const renderDashboard = () => {
    switch (user.role) {
      case "user":
        return (
          <>
            <Text style={styles.sectionTitle}>
              Citizen Dashboard
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Report Road Problems
              </Text>
              <Text style={styles.cardDescription}>
                Report potholes, road damage, waterlogging,
                accidents, and traffic problems.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                My Contributions
              </Text>
              <Text style={styles.cardDescription}>
                View and track the reports you have submitted.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Trust Level
              </Text>
              <Text style={styles.cardDescription}>
                Your contribution and trust score will grow
                as your reports are verified.
              </Text>
            </View>
          </>
        );

      case "moderator":
        return (
          <>
            <Text style={styles.sectionTitle}>
              Moderator Dashboard
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Review Reports
              </Text>
              <Text style={styles.cardDescription}>
                Review submitted road reports and check
                their accuracy.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Verify Reports
              </Text>
              <Text style={styles.cardDescription}>
                Verify valid reports or reject inaccurate
                submissions.
              </Text>
            </View>
          </>
        );

      case "admin":
        return (
          <>
            <Text style={styles.sectionTitle}>
              Admin Dashboard
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                User Management
              </Text>
              <Text style={styles.cardDescription}>
                Manage user accounts and roles.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Report Management
              </Text>
              <Text style={styles.cardDescription}>
                Monitor reports and their verification status.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                System Overview
              </Text>
              <Text style={styles.cardDescription}>
                View overall platform activity and contributions.
              </Text>
            </View>
          </>
        );

      default:
        return (
          <Text style={styles.cardDescription}>
            No dashboard available for this role.
          </Text>
        );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.appName}>
        Dhaka Route Intelligence
      </Text>

      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>
          Welcome, {user.name}!
        </Text>

        <Text style={styles.email}>
          {user.email}
        </Text>

        <Text style={styles.role}>
          Role: {user.role.toUpperCase()}
        </Text>
      </View>

      {renderDashboard()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 20,
  },
  welcomeCard: {
    backgroundColor: "#0F766E",
    padding: 22,
    borderRadius: 15,
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  email: {
    fontSize: 14,
    color: "#CCFBF1",
    marginTop: 7,
  },
  role: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 13,
    marginBottom: 14,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0F766E",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 21,
  },
});
