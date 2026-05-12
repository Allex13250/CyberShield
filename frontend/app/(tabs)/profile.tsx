import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "../../src/auth";
import { api } from "../../src/api";
import { spacing, radius } from "../../src/theme";
import { useTheme } from "../../src/themeContext";

export default function ProfileTab() {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  const router = useRouter();
  const { user, signOut, setUser } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textPrimary }}>No session</Text>
      </View>
    );
  }

  async function toggleBiometric(next: boolean) {
    try {
      setBusy(true);
      if (next && Platform.OS !== "web") {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!compatible || !enrolled) {
          Alert.alert("Not available", "Enroll a fingerprint or Face ID in device settings first.");
          return;
        }
        const r = await LocalAuthentication.authenticateAsync({
          promptMessage: "Confirm to enable biometric unlock",
        });
        if (!r.success) {
          Alert.alert("Cancelled", "Biometric verification was not successful.");
          return;
        }
      }
      const res = await api.post("/auth/biometric", { enabled: next });
      setUser(res.data);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.detail || "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign out", "End your CyberShield session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  const isPro = user.tier === "professional";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }} testID="profile-screen">
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.full_name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={[styles.tierBadge, isPro ? styles.tierPro : styles.tierStudent]}>
          <Ionicons
            name={isPro ? "shield-checkmark" : "school-outline"}
            color={isPro ? "#000" : colors.neonGreen}
            size={14}
          />
          <Text style={[styles.tierText, { color: isPro ? "#000" : colors.neonGreen }]}>
            {isPro ? "PROFESSIONAL" : "STUDENT"}
          </Text>
        </View>
      </View>

      {!isPro && (
        <TouchableOpacity
          testID="upgrade-cta-btn"
          style={styles.upgradeCard}
          onPress={() => router.push("/subscription")}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.upgradeTitle}>UNLOCK PROFESSIONAL ↑</Text>
            <Text style={styles.upgradeDesc}>
              Access advanced labs (Kerberoasting, JWT, Container Escape), priority compute, and analytics export.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.neonGreen} />
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SECURITY</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Biometric unlock</Text>
            <Text style={styles.rowSubtitle}>
              {Platform.OS === "web" ? "Not available on web" : "Use Face ID / Touch ID at login"}
            </Text>
          </View>
          <Switch
            testID="biometric-switch"
            value={user.biometric_enabled}
            onValueChange={toggleBiometric}
            disabled={busy || Platform.OS === "web"}
            trackColor={{ false: colors.border, true: colors.neonGreenSoft }}
            thumbColor={user.biometric_enabled ? colors.neonGreen : colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <KV k="Operator ID" v={user.id.slice(0, 18) + "…"} />
        <KV k="Role" v={user.is_admin ? "ADMIN" : "OPERATOR"} />
        <KV k="Joined" v={new Date(user.created_at).toLocaleDateString()} />
      </View>

      <TouchableOpacity
        testID="open-settings-btn"
        style={styles.settingsBtn}
        onPress={() => router.push("/settings")}
      >
        <Ionicons name="color-palette-outline" size={18} color={colors.cyan} />
        <Text style={styles.settingsBtnText}>APPEARANCE & THEMES</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="signout-btn"
        style={styles.signOutBtn}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>TERMINATE SESSION</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

const _stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.xl,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    backgroundColor: "#000",
    borderColor: colors.neonGreen,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.neonGreen, fontSize: 30, fontWeight: "800", fontFamily: "Courier" },
  name: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  email: { color: colors.textSecondary, marginTop: 2, fontFamily: "Courier", fontSize: 12 },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
    gap: 6,
  },
  tierPro: { backgroundColor: colors.neonGreen },
  tierStudent: { borderWidth: 1, borderColor: colors.neonGreen },
  tierText: { fontWeight: "800", letterSpacing: 2, fontSize: 11, marginLeft: 4 },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.neonGreen,
    borderWidth: 1,
    padding: spacing.lg,
    borderRadius: radius.sm,
  },
  upgradeTitle: { color: colors.neonGreen, fontWeight: "800", letterSpacing: 2, fontSize: 13 },
  upgradeDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  sectionTitle: { color: colors.cyan, letterSpacing: 3, fontSize: 11, fontWeight: "800", marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  rowTitle: { color: colors.textPrimary, fontWeight: "600" },
  rowSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: "Courier" },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  kvKey: { color: colors.textSecondary },
  kvVal: { color: colors.textPrimary, fontFamily: "Courier" },
  signOutBtn: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 14,
    gap: 8,
    borderRadius: radius.sm,
  },
  signOutText: { color: colors.danger, fontWeight: "800", letterSpacing: 2, marginLeft: 6 },
  settingsBtn: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  settingsBtnText: { color: colors.textPrimary, fontWeight: "800", letterSpacing: 2, marginLeft: 6 },
});
