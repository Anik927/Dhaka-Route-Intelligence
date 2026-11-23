import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

export default function RoutesTab() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Intelligence</Text>
      <Text style={styles.note}>Find a way around reported road disruptions.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push("/route/planner")}>
        <Text style={styles.buttonText}>Plan a route</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center", backgroundColor: "#f5f5f5" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  note: { fontSize: 14, color: "#666", marginBottom: 16 },
  button: { backgroundColor: "#1565c0", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
});