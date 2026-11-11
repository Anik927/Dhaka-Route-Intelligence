
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

export default function TabLayout() {
  const { user } = useAuth();

  const isUser = user?.role === "user";
  const isModerator = user?.role === "moderator";
  const isAdmin = user?.role === "admin";

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: "#0a7ea4",
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="home" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          href: isUser ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="compass" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          href: isUser ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="add-circle" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="my-report"
        options={{
          title: "My Reports",
          href: isUser ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="document-text" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="moderator"
        options={{
          title: "Review",
          href: isModerator ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="clipboard" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="admin-users"
        options={{
          title: "Users",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="people" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="admin-report"
        options={{
          title: "Admin Reports",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="shield-checkmark" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: user ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
