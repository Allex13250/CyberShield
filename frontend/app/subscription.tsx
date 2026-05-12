import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { api } from "../src/api";
import { useAuth } from "../src/auth";
import { colors, spacing, radius } from "../src/theme";

type Pkg = { id: string; amount: number; currency: string; label: string };

const FEATURES_STUDENT = [
  "Easy / Medium labs",
  "Limited compute (2h instance TTL)",
  "Personal progress tracking",
  "Community leaderboard",
];

const FEATURES_PRO = [
  "All advanced labs (Kerberoasting, JWT, Container Escape)",
  "Priority compute & longer TTLs",
  "Real-time server telemetry exports",
  "Team analytics dashboard",
  "Priority support",
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/payments/packages");
        setPackages(res.data.packages);
      } catch (err: any) {
        Alert.alert("Error", err?.response?.data?.detail || "Failed to load");
      }
    })();
  }, []);

  async function startCheckout(pkgId: string) {
    setBusy(pkgId);
    try {
      const origin =
        Platform.OS === "web"
          ? (typeof window !== "undefined" ? window.location.origin : process.env.EXPO_PUBLIC_BACKEND_URL || "")
          : process.env.EXPO_PUBLIC_BACKEND_URL || "";
      const res = await api.post("/payments/checkout", {
        package_id: pkgId,
        origin_url: origin,
      });
      const url: string = res.data.url;
      const sessionId: string = res.data.session_id;

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.location.href = url;
        }
      } else {
        const result = await WebBrowser.openBrowserAsync(url);
        // After return, refresh status
        await pollStatus(sessionId);
      }
    } catch (err: any) {
      Alert.alert("Checkout error", err?.response?.data?.detail || "Failed to start checkout");
    } finally {
      setBusy(null);
    }
  }

  async function pollStatus(sessionId: string, attempt = 0) {
    if (attempt > 10) return;
    try {
      const res = await api.get(`/payments/status/${sessionId}`);
      if (res.data.payment_status === "paid") {
        await refresh();
        Alert.alert("Upgrade complete", "Welcome to Professional tier!");
        router.replace("/(tabs)/profile");
        return;
      }
      setTimeout(() => pollStatus(sessionId, attempt + 1), 2500);
    } catch {
      setTimeout(() => pollStatus(sessionId, attempt + 1), 2500);
    }
  }

  const isPro = user?.tier === "professional";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }} testID="subscription-screen">
      <Text style={styles.title}>UPGRADE PROTOCOL</Text>
      <Text style={styles.subtitle}>// Unlock the full CyberShield arsenal</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.tierLabel}>TIER 01</Text>
            <Text style={styles.tierName}>STUDENT</Text>
          </View>
          <Text style={styles.price}>FREE</Text>
        </View>
        {FEATURES_STUDENT.map((f) => (
          <FeatureRow key={f} text={f} />
        ))}
        <View style={[styles.statusPill, { borderColor: colors.textMuted, alignSelf: "flex-start", marginTop: spacing.md }]}>
          <Text style={[styles.statusPillText, { color: colors.textMuted }]}>
            {!isPro ? "ACTIVE" : "DOWNGRADED"}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { borderColor: colors.neonGreen }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.tierLabel, { color: colors.neonGreen }]}>TIER 02</Text>
            <Text style={styles.tierName}>PROFESSIONAL</Text>
          </View>
          <Text style={[styles.price, { color: colors.neonGreen }]}>
            $9.99<Text style={{ color: colors.textSecondary, fontSize: 13 }}>/mo</Text>
          </Text>
        </View>
        {FEATURES_PRO.map((f) => (
          <FeatureRow key={f} text={f} pro />
        ))}

        {isPro ? (
          <View style={[styles.statusPill, { borderColor: colors.neonGreen, alignSelf: "flex-start", marginTop: spacing.md, backgroundColor: colors.neonGreen }]}>
            <Text style={[styles.statusPillText, { color: "#000" }]}>SUBSCRIBED</Text>
          </View>
        ) : (
          <>
            {packages.map((p) => (
              <TouchableOpacity
                key={p.id}
                testID={`checkout-${p.id}`}
                style={[styles.checkoutBtn, busy === p.id && { opacity: 0.6 }]}
                onPress={() => startCheckout(p.id)}
                disabled={busy !== null}
              >
                {busy === p.id ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Ionicons name="card" size={16} color="#000" />
                    <Text style={styles.checkoutBtnText}>
                      {p.label.toUpperCase()} · ${p.amount.toFixed(2)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
            <Text style={styles.disclaimer}>
              Powered by Stripe (test mode). Card 4242 4242 4242 4242 — any future date — any CVC.
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function FeatureRow({ text, pro }: { text: string; pro?: boolean }) {
  return (
    <View style={styles.feature}>
      <Ionicons
        name={pro ? "shield-checkmark" : "checkmark"}
        size={14}
        color={pro ? colors.neonGreen : colors.textSecondary}
      />
      <Text style={[styles.featureText, pro && { color: colors.textPrimary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: "800", letterSpacing: 3 },
  subtitle: { color: colors.textSecondary, fontFamily: "Courier", marginTop: 4 },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    borderRadius: radius.sm,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.md },
  tierLabel: { color: colors.textMuted, letterSpacing: 3, fontSize: 11, fontWeight: "800" },
  tierName: { color: colors.textPrimary, fontSize: 22, fontWeight: "800", letterSpacing: 2, marginTop: 4 },
  price: { color: colors.textPrimary, fontSize: 22, fontWeight: "800", fontFamily: "Courier" },
  feature: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  featureText: { color: colors.textSecondary, fontSize: 13, marginLeft: 6 },
  checkoutBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.neonGreen,
    paddingVertical: 13,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.sm,
  },
  checkoutBtnText: { color: "#000", fontWeight: "800", letterSpacing: 2, marginLeft: 6 },
  disclaimer: { color: colors.textMuted, fontSize: 11, marginTop: spacing.md, fontFamily: "Courier", textAlign: "center" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusPillText: { fontWeight: "800", letterSpacing: 2, fontSize: 11 },
});
