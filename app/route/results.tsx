import { useState } from "react";
import { Button, FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import RouteCard from "../../components/route/RouteCard";
import { mockRoutes } from "../../constants/mockRoutes";

export default function RouteResultsScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(mockRoutes[0].id);
  const selectedRoute = mockRoutes.find((r) => r.id === selectedId);

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text>Map placeholder: showing {selectedRoute?.name}</Text>
      </View>

      <FlatList
        data={mockRoutes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <RouteCard
            route={item}
            selected={item.id === selectedId}
            onPress={() => setSelectedId(item.id)}
          />
        )}
      />

      <Button
        title="View details"
        onPress={() =>
          router.push({ pathname: "/route/details", params: { id: selectedId } })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#ddd",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
});