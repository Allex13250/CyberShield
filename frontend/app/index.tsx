import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth";
import { colors } from "../src/theme";

export default function Splash() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/(tabs)");
    else router.replace("/login");
  }, [loading, user]);

  return (
    <View style={styles.container} testID="splash-screen">
      <Text style={styles.brand}>CYBER<Text style={{ color: colors.neonGreen }}>SHIELD</Text></Text>
      <Text style={styles.sub}>// initializing secure shell...</Text>
      <ActivityIndicator color={colors.neonGreen} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: "Courier",
    marginTop: 10,
  },
});
