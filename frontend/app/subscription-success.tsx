import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { useAuth } from "../src/auth";
import { colors, spacing, radius } from "../src/theme";

export default function SubscriptionSuccess() {
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const router = useRouter();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!session_id) {
      setStatus("error");
      return;
    }
    let alive = true;
    let cur = 0;
    const tick = async () => {
      if (!alive) return;
      cur += 1;
      setAttempt(cur);
      try {
        const res = await api.get(`/payments/status/${session_id}`);
        if (!alive) return;
        if (res.data.payment_status === "paid") {
          await refresh();
          setStatus("paid");
          return;
        }
        if (cur > 12) {
          setStatus("pending");
          return;
        }
        setTimeout(tick, 2500);
      } catch {
        if (cur > 12) setStatus("error");
        else setTimeout(tick, 2500);
      }
    };
    tick();
    return () => {
      alive = false;
    };
  }, [session_id, refresh]);

  return (
    <View style={styles.container} testID="subscription-success-screen">
      {status === "checking" && (
        <>
          <ActivityIndicator color={colors.neonGreen} />
          <Text style={styles.title}>VERIFYING PAYMENT</Text>
          <Text style={styles.sub}>// attempt {attempt} of 12 · contacting Stripe...</Text>
        </>
      )}
      {status === "paid" && (
        <>
          <Ionicons name="shield-checkmark" size={64} color={colors.neonGreen} />
          <Text style={styles.title}>ACCESS GRANTED</Text>
          <Text style={styles.sub}>Welcome to Professional tier, operator.</Text>
          <TouchableOpacity
            testID="success-continue-btn"
            style={styles.primaryBtn}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.primaryBtnText}>{">_ ENTER COMMAND CENTER"}</Text>
          </TouchableOpacity>
        </>
      )}
      {status === "pending" && (
        <>
          <Ionicons name="time" size={56} color={colors.warning} />
          <Text style={styles.title}>STILL PROCESSING</Text>
          <Text style={styles.sub}>Your bank is taking a moment. Refresh your profile shortly.</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.warning }]}
            onPress={() => router.replace("/(tabs)/profile")}
          >
            <Text style={styles.primaryBtnText}>BACK TO PROFILE</Text>
          </TouchableOpacity>
        </>
      )}
      {status === "error" && (
        <>
          <Ionicons name="warning" size={56} color={colors.danger} />
          <Text style={styles.title}>VERIFICATION FAILED</Text>
          <Text style={styles.sub}>We could not confirm your payment.</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.danger }]}
            onPress={() => router.replace("/subscription")}
          >
            <Text style={styles.primaryBtnText}>RETRY</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "800", letterSpacing: 3, marginTop: spacing.lg },
  sub: { color: colors.textSecondary, marginTop: 8, fontFamily: "Courier", textAlign: "center" },
  primaryBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.neonGreen,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
  },
  primaryBtnText: { color: "#000", fontWeight: "800", letterSpacing: 2 },
});
