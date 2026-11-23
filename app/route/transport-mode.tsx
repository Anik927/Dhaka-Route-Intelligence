import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { transportModes } from "../../constants/transportModes";

export default function TransportModeScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose transport mode</Text>

      {transportModes.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.option, item.id === mode && styles.selectedOption]}
          onPress={() =>
            router.navigate({ pathname: "/route/planner", params: { mode: item.id } })
          }
        >
          <Text style={styles.optionText}>{item.label}</Text>
          {item.note && <Text style={styles.note}>{item.note}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  option: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedOption: { borderColor: "#0f766e", borderWidth: 2, backgroundColor: "#e0f2f1" },
  optionText: { fontSize: 16 },
  note: { color: "#666", marginTop: 4 },
});