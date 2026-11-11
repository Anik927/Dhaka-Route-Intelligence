
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

import { useAuth } from "../../context/AuthContext";
import {
  createReport,
  ReportCategory,
} from "../../services/reportService";

import RoleGuard from "../../components/auth/RoleGuard";

const categories: ReportCategory[] = [
  "Pothole",
  "Road Damage",
  "Waterlogging",
  "Traffic",
  "Accident",
  "Other",
];

function ReportForm() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<ReportCategory>("Pothole");

  const [imageUri, setImageUri] = useState<string | null>(null);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Select image from gallery
  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access to select a photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image selection error:", error);
      Alert.alert("Error", "Unable to select image.");
    }
  };

  // Take photo using camera
  const takePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow camera access to take a photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Unable to open camera.");
    }
  };

  // Show camera and gallery options
  const choosePhoto = () => {
    Alert.alert("Add Report Photo", "Choose an option", [
      {
        text: "Camera",
        onPress: takePhoto,
      },
      {
        text: "Gallery",
        onPress: pickImage,
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  // Get current GPS location
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Location Permission",
          "Please allow location access to attach your current location."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);

      Alert.alert("Success", "Your location has been added.");
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please try again."
      );
    } finally {
      setLocationLoading(false);
    }
  };

  // Submit road report
  const handleSubmit = async () => {
    if (submitting) return;

    if (!user) {
      Alert.alert("Login Required", "Please log in first.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Validation Error", "Please enter a report title.");
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Validation Error",
        "Please describe the road problem."
      );
      return;
    }

    if (latitude === null || longitude === null) {
      Alert.alert(
        "Location Required",
        "Please add your current location before submitting."
      );
      return;
    }

    try {
      setSubmitting(true);

      // Save report to AsyncStorage
      const report = await createReport({
        userId: user.id,
        userName: user.name,
        title: title.trim(),
        description: description.trim(),
        category,
        latitude,
        longitude,
        imageUri,
      });

      // Clear form after successful saving
      setTitle("");
      setDescription("");
      setCategory("Pothole");
      setImageUri(null);
      setLatitude(null);
      setLongitude(null);

      Alert.alert(
        "Report Submitted",
        `Your report has been submitted successfully.\nReport ID: ${report.id}`
      );
    } catch (error) {
      console.error("Report submission error:", error);

      Alert.alert(
        "Submission Failed",
        "Unable to submit your report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Report a Road Problem</Text>

      <Text style={styles.subtitle}>
        Help others by reporting road conditions in your area.
      </Text>

      {/* Report Title */}
      <Text style={styles.label}>Report Title *</Text>

      <TextInput
        style={styles.input}
        placeholder="Example: Large pothole near main road"
        value={title}
        onChangeText={setTitle}
      />

      {/* Category */}
      <Text style={styles.label}>Problem Category *</Text>

      <View style={styles.categoryContainer}>
        {categories.map((item) => (
          <Pressable
            key={item}
            style={[
              styles.categoryButton,
              category === item && styles.selectedCategory,
            ]}
            onPress={() => setCategory(item)}
          >
            <Text
              style={[
                styles.categoryText,
                category === item && styles.selectedCategoryText,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.label}>Description *</Text>

      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Describe the road problem in detail..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      {/* Photo */}
      <Text style={styles.label}>Report Photo</Text>

      <Pressable
        style={styles.photoButton}
        onPress={choosePhoto}
      >
        <Text style={styles.photoButtonText}>
          {imageUri
            ? "Change Photo"
            : "Take Photo / Choose from Gallery"}
        </Text>
      </Pressable>

      {imageUri && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
          />

          <Pressable onPress={() => setImageUri(null)}>
            <Text style={styles.removeImage}>Remove Photo</Text>
          </Pressable>
        </View>
      )}

      {/* GPS Location */}
      <Text style={styles.label}>Current Location *</Text>

      <Pressable
        style={styles.locationButton}
        onPress={getCurrentLocation}
        disabled={locationLoading}
      >
        {locationLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.locationButtonText}>
            {latitude !== null
              ? "Update Current Location"
              : "Get My Current Location"}
          </Text>
        )}
      </Pressable>

      {latitude !== null && longitude !== null && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            Latitude: {latitude.toFixed(6)}
          </Text>

          <Text style={styles.locationText}>
            Longitude: {longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Submit */}
      <Pressable
        style={[
          styles.submitButton,
          submitting && styles.disabledButton,
        ]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>
            Submit Report
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 8,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    marginBottom: 25,
    lineHeight: 21,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 9,
    marginTop: 18,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
  },
  descriptionInput: {
    height: 120,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  selectedCategory: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  categoryText: {
    color: "#334155",
    fontSize: 13,
  },
  selectedCategoryText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  photoButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0F766E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  photoButtonText: {
    color: "#0F766E",
    fontWeight: "700",
  },
  imageContainer: {
    marginTop: 12,
    alignItems: "flex-start",
  },
  previewImage: {
    width: "100%",
    height: 190,
    borderRadius: 12,
  },
  removeImage: {
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 8,
  },
  locationButton: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  locationButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  locationInfo: {
    backgroundColor: "#DBEAFE",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  locationText: {
    color: "#1E40AF",
    fontSize: 13,
    marginTop: 3,
  },
  submitButton: {
    backgroundColor: "#0F766E",
    padding: 17,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

// Protect the entire Report screen
export default function ReportScreen() {
  return (
    <RoleGuard allowedRoles={["user"]}>
      <ReportForm />
    </RoleGuard>
  );
}
