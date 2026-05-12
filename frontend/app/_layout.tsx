import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
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
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
