import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { RouteOption } from "@/constants/mockRoutes";

type Props = {
  route: RouteOption;
  onPress: () => void;
};

export default function RouteCard({ route, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, route.recommended && styles.recommendedCard]}
      onPress={onPress}
    >
      {route.recommended && <Text style={styles.badge}>Recommended</Text>}
      <Text style={styles.name}>{route.name}</Text>
      <Text>{route.timeMin} min · {route.distanceKm} km</Text>

      {route.extraTimeMin > 0 && (
        <Text style={styles.extra}>
          +{route.extraTimeMin} min, +{route.extraDistanceKm} km vs normal route
        </Text>
      )}

      <Text style={route.disruptionsCrossed > 0 ? styles.warning : styles.ok}>
        {route.disruptionsCrossed} reported disruption(s) crossed
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  recommendedCard: { borderColor: "#2e7d32", borderWidth: 2 },
  badge: { color: "#2e7d32", fontWeight: "bold", marginBottom: 4 },
  name: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  extra: { color: "#666", marginTop: 4 },
  warning: { color: "#c62828", marginTop: 4 },
  ok: { color: "#2e7d32", marginTop: 4 },
});