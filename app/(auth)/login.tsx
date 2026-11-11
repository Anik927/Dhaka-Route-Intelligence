
import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { router } from "expo-router";

import FormField from "../../components/auth/FormField";
import AuthButton from "../../components/auth/AuthButton";

import { loginDemo } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

// Form data interface
interface LoginForm {
  email: string;
  password: string;
}

// Validation error interface
interface LoginErrors {
  email?: string;
  password?: string;
}

// Validation function
function validateForm(data: LoginForm): LoginErrors {
  const errors: LoginErrors = {};

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Email validation
  if (!data.email.trim()) {
    errors.email = "Email is required.";
  } else if (!emailPattern.test(data.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  // Password validation
  if (!data.password) {
    errors.password = "Password is required.";
  } else if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
}

// Login Screen
export default function LoginScreen() {
  const { login } = useAuth();

  // Form state
  const [formData, setFormData] = useState<LoginForm>({
    email: "",
    password: "",
  });

  // Validation errors
  const [errors, setErrors] = useState<LoginErrors>({});

  // Track touched fields
  const [touched, setTouched] = useState<
    Record<string, boolean>
  >({});

  // Track submit attempt
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login error message
  const [serverError, setServerError] = useState("");

  // Update form fields
  const updateField = (
    field: keyof LoginForm,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setServerError("");
  };

  // Mark field as touched
  const markTouched = (field: keyof LoginForm) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  // Live validation using useEffect
  useEffect(() => {
    const newErrors = validateForm(formData);
    setErrors(newErrors);
  }, [formData]);

  // Display errors after interaction or submit attempt
  const getFieldError = (field: keyof LoginErrors) => {
    return touched[field] || submitAttempted
      ? errors[field]
      : undefined;
  };

  // Check whether form is valid
  const isFormValid =
    Object.keys(errors).length === 0 &&
    formData.email.trim().length > 0 &&
    formData.password.length >= 8;

  // Login button handler
  const handleLogin = async () => {
    if (isSubmitting) return;

    setSubmitAttempted(true);

    setTouched({
      email: true,
      password: true,
    });

    // Validate before submitting
    const currentErrors = validateForm(formData);

    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError("");

      // Authenticate using AsyncStorage
      const result = await loginDemo(
        formData.email.trim(),
        formData.password
      );

      if (result.success) {
        console.log("Login successful:", result.user);

        // Save session before navigating
        await login(result.user);

        // Navigate to Home tab
        router.replace("/(tabs)");
      } else {
        setServerError(result.message);
      }
    } catch (error) {
      console.error("Login error:", error);

      setServerError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login UI
  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* App Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>DR</Text>
          </View>

          {/* App Name */}
          <Text style={styles.appName}>
            Dhaka Route Intelligence
          </Text>

          {/* Heading */}
          <Text style={styles.heading}>
            Welcome Back!
          </Text>

          <Text style={styles.subtitle}>
            Login to check road conditions and plan your journey.
          </Text>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <FormField
              label="Email Address"
              value={formData.email}
              onChangeText={(text) =>
                updateField("email", text)
              }
              onBlur={() => markTouched("email")}
              placeholder="Enter your email"
              keyboardType="email-address"
              error={getFieldError("email")}
            />

            {/* Password Field */}
            <FormField
              label="Password"
              value={formData.password}
              onChangeText={(text) =>
                updateField("password", text)
              }
              onBlur={() => markTouched("password")}
              placeholder="Enter your password"
              secureTextEntry
              error={getFieldError("password")}
            />

            {/* Authentication Error */}
            {serverError ? (
              <Text style={styles.serverError}>
                {serverError}
              </Text>
            ) : null}

            {/* Login Button */}
            <AuthButton
              title="Login"
              onPress={handleLogin}
              loading={isSubmitting}
              disabled={isSubmitting || !isFormValid}
            />

            {/* Register Navigation */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?
              </Text>

              <Pressable
                onPress={() =>
                  router.push("/(auth)/register")
                }
              >
                <Text style={styles.link}>
                  Register
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Demo Credentials */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>
              Demo Account
            </Text>

            <Text style={styles.demoText}>
              student@dhakaroute.com
            </Text>

            <Text style={styles.demoText}>
              Password: 12345678
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles
const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    paddingVertical: 35,
    justifyContent: "center",
  },
  logoContainer: {
    width: 75,
    height: 75,
    borderRadius: 20,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 15,
  },
  logo: {
    fontSize: 27,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  appName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 30,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 21,
    marginBottom: 30,
  },
  form: {
    width: "100%",
  },
  serverError: {
    color: "#DC2626",
    fontSize: 13,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
    gap: 5,
  },
  footerText: {
    color: "#64748B",
    fontSize: 14,
  },
  link: {
    color: "#0F766E",
    fontWeight: "700",
    fontSize: 14,
  },
  demoBox: {
    backgroundColor: "#CCFBF1",
    borderRadius: 12,
    padding: 15,
    marginTop: 30,
  },
  demoTitle: {
    color: "#115E59",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 6,
  },
  demoText: {
    color: "#134E4A",
    fontSize: 13,
    marginTop: 3,
  },
});
