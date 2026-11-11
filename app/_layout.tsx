
import { Stack } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";

import {
  AuthProvider,
  useAuth,
} from "../context/AuthContext";

// Root navigation
function RootNavigator() {
  const { isLoading } = useAuth();

  // Wait until AsyncStorage session restoration finishes
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal" }}
      />
    </Stack>
  );
}

// Root Layout
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
});
