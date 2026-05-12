import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth";
import { ThemeProvider, useTheme } from "../src/themeContext";

function ThemedStack() {
  const { colors, mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary, fontWeight: "700", letterSpacing: 1 },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lab/[id]" options={{ title: "LAB DETAIL", presentation: "card" }} />
        <Stack.Screen name="subscription" options={{ title: "SUBSCRIPTION" }} />
        <Stack.Screen name="subscription-success" options={{ title: "PAYMENT" }} />
        <Stack.Screen name="settings" options={{ title: "// SETTINGS" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
