
import React from "react";

import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  onBlur?: () => void;
}

export default function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  onBlur,
}: FormFieldProps) {

  return (
    <View style={styles.container}>

      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onBlur={onBlur}
      />

      {error ? (
        <Text style={styles.errorText}>
          {error}
        </Text>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  inputError: {
    borderColor: "#DC2626",
  },

  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 5,
  },

});
