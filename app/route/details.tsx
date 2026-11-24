import { StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { mockRoutes } from "../../constants/mockRoutes";

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const route = mockRoutes.find((r) => r.id === Number(id));

  if (!route) {
    return (
      <View style={styles.container}>
        <Text>Route not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Route details", headerShown: true }} />
      <Text style={styles.title}>{route.name}</Text>

      <View style={styles.mapPlaceholder}>
        <Text>Map goes here (Member 2's Map component)</Text>
      </View>

      <Text>Time: {route.timeMin} min</Text>
      <Text>Distance: {route.distanceKm} km</Text>
      <Text>Extra time vs normal: {route.extraTimeMin} min</Text>
      <Text>Extra distance vs normal: {route.extraDistanceKm} km</Text>
      <Text style={styles.disruptions}>
        Reported disruptions crossed: {route.disruptionsCrossed}
      </Text>
      <Text style={styles.note}>
        No reports does not guarantee a route is clear.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  mapPlaceholder: {
    height: 180,
    backgroundColor: "#ddd",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  disruptions: { marginTop: 8, fontWeight: "bold" },
  note: { marginTop: 8, color: "#666" },
});