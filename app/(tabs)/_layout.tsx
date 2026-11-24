import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

export default function TabLayout() {
  const { user } = useAuth();

  const isModerator = user?.role === "moderator";
  const isAdmin = user?.role === "admin";
  const loggedIn = !!user;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0a7ea4",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />

      {/* Part 2: shown for every logged-in role */}
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          href: loggedIn ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          href: loggedIn ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          href: loggedIn ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="moderator"
        options={{
          title: "Review",
          href: isModerator ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="admin-users"
        options={{
          title: "Users",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="admin-report"
        options={{
          title: "Admin Reports",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: loggedIn ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />

      {/* Hidden from the tab bar but still reachable by link or button */}
      <Tabs.Screen name="explore" options={{ title: "Explore", href: null }} />
      <Tabs.Screen name="report" options={{ title: "Report", href: null }} />
      <Tabs.Screen name="my-report" options={{ title: "My Reports", href: null }} />
    </Tabs>
  );
}