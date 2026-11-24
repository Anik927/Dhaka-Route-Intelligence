
import { useState } from "react";

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Link, useRouter } from "expo-router";

import FormField from "../../components/auth/FormField";
import AuthButton from "../../components/auth/AuthButton";

import { registerDemo } from "../../services/authService";

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Validate registration form
  function validateForm() {
    const newErrors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    };

    if (!name.trim()) {
      newErrors.name = "Name is required.";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password =
        "Password must contain at least 8 characters.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some(
      (error) => error !== ""
    );
  }

  // Register new user
  const handleRegister = async () => {
    if (loading) return;

    if (!validateForm()) return;

    try {
      setLoading(true);

      // Save new account using AsyncStorage
      const result = await registerDemo(
        name.trim(),
        email.trim(),
        password
      );

      if (!result.success) {
        Alert.alert("Registration Failed", result.message);
        return;
      }

      Alert.alert(
        "Success",
        "Your account has been created successfully. Please log in.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
    } catch (error) {
      console.error("Registration error:", error);

      Alert.alert(
        "Registration Failed",
        "Something went wrong while creating your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>DR</Text>

          <Text style={styles.title}>
            Create Account
          </Text>

          <Text style={styles.subtitle}>
            Join Dhaka Route Intelligence
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            error={errors.name}
            autoCapitalize="words"
          />

          <FormField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            error={errors.password}
            secureTextEntry
            autoCapitalize="none"
          />

          <FormField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <AuthButton
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{" "}
          </Text>

          <Link
            href="/(auth)/login"
            style={styles.link}
          >
            Login
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 65,
    height: 65,
    borderRadius: 18,
    backgroundColor: "#176B87",
    color: "#FFFFFF",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 25,
    fontWeight: "bold",
    overflow: "hidden",
    marginBottom: 18,
  },
  title: {
    fontSize: 27,
    fontWeight: "bold",
    color: "#172B4D",
  },
  subtitle: {
    fontSize: 14,
    color: "#68778D",
    marginTop: 8,
  },
  form: {
    gap: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  footerText: {
    color: "#68778D",
  },
  link: {
    color: "#176B87",
    fontWeight: "bold",
  },
});
