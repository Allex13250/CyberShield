import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useTheme } from "../../src/themeContext";

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.neonGreen,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 30 : 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
        headerStyle: { backgroundColor: colors.bg, borderBottomColor: colors.border, borderBottomWidth: 1 },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: "700", letterSpacing: 0.4 },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "LABS",
          headerTitle: "// LAB CATALOG",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="terminal-outline" color={color} size={size} />
          ),
          tabBarTestID: "tab-labs",
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: "MONITOR",
          headerTitle: "// SERVER MONITOR",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" color={color} size={size} />
          ),
          tabBarTestID: "tab-monitor",
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "INTEL",
          headerTitle: "// ANALYTICS",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" color={color} size={size} />
          ),
          tabBarTestID: "tab-analytics",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "AGENT",
          headerTitle: "// AGENT PROFILE",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
          tabBarTestID: "tab-profile",
        }}
      />
    </Tabs>
  );
}
