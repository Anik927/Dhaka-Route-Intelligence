
import React from "react";

import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: AuthButtonProps) {

  return (
    <Pressable
      style={[
        styles.button,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >

      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>
          {title}
        </Text>
      )}

    </Pressable>
  );
}

const styles = StyleSheet.create({

  button: {
    height: 54,
    backgroundColor: "#0F766E",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  disabled: {
    opacity: 0.55,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

});
