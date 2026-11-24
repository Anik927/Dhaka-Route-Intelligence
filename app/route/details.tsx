import RouteMap from "../../components/map/RouteMap";
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

      <RouteMap route={route} style={styles.map} />

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
  map: { height: 220, borderRadius: 10, overflow: "hidden", marginBottom: 12 },
  disruptions: { marginTop: 8, fontWeight: "bold" },
  note: { marginTop: 8, color: "#666" },
});