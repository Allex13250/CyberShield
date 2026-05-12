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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "../../src/auth";
import { api } from "../../src/api";
import { spacing, radius } from "../../src/theme";
import { useTheme } from "../../src/themeContext";
import { Avatar } from "../../src/Avatar";

export default function ProfileTab() {
  const { colors, themes, themeId, setTheme, mode, toggleMode } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  const router = useRouter();
  const { user, signOut, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const cycleTheme = () => {
    const i = themes.findIndex((t) => t.id === themeId);
    const next = themes[(i + 1) % themes.length];
    setTheme(next.id);
  };

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

  function openEdit() {
    if (!user) return;
    setDraftName(user.full_name);
    setEditing(true);
  }

  async function saveEdit() {
    const next = draftName.trim();
    if (next.length < 2) {
      Alert.alert("Too short", "Name must be at least 2 characters");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await api.patch("/auth/me", { full_name: next });
      setUser(res.data);
      setEditing(false);
    } catch (err: any) {
      Alert.alert("Update failed", err?.response?.data?.detail || "Try again");
    } finally {
      setSavingEdit(false);
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
        <TouchableOpacity
          testID="edit-profile-btn"
          style={styles.editIcon}
          onPress={openEdit}
        >
          <Ionicons name="pencil" size={14} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.avatarRing}>
          <Avatar seed={user.id} size={80} name={user.full_name} />
        </View>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={[styles.tierBadge, isPro ? styles.tierPro : styles.tierStudent]}>
          <Ionicons
            name={isPro ? "shield-checkmark" : "school-outline"}
            color={isPro ? colors.onPrimary : colors.neonGreen}
            size={14}
          />
          <Text style={[styles.tierText, { color: isPro ? colors.onPrimary : colors.neonGreen }]}>
            {isPro ? "PROFESSIONAL" : "STUDENT"}
          </Text>
        </View>

        <View style={styles.themeQuickRow}>
          <TouchableOpacity testID="cycle-theme-btn" style={styles.themeChip} onPress={cycleTheme}>
            <View style={[styles.themeSwatchDot, { backgroundColor: colors.neonGreen }]} />
            <Text style={styles.themeChipText}>
              {(themes.find((t) => t.id === themeId)?.name) ?? "THEME"}
            </Text>
            <Ionicons name="shuffle" size={13} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity testID="toggle-mode-btn" style={styles.modeChip} onPress={toggleMode}>
            <Ionicons name={mode === "dark" ? "moon" : "sunny"} size={14} color={colors.textPrimary} />
          </TouchableOpacity>
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

      <TouchableOpacity testID="signout-btn" style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>TERMINATE SESSION</Text>
      </TouchableOpacity>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalBackdrop} onPress={() => setEditing(false)} />
          <View style={styles.modalCard} testID="edit-profile-modal">
            <Text style={styles.modalTitle}>EDIT PROFILE</Text>
            <Text style={styles.modalLabel}>FULL NAME</Text>
            <TextInput
              testID="edit-name-input"
              style={styles.modalInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>EMAIL (read-only)</Text>
            <View style={[styles.modalInput, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.textSecondary }}>{user.email}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                testID="edit-cancel-btn"
                style={styles.modalCancel}
                onPress={() => setEditing(false)}
                disabled={savingEdit}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="edit-save-btn"
                style={[styles.modalSave, savingEdit && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>SAVE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    position: "relative",
    ...colors.cardShadow,
  },
  editIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElev,
    borderColor: colors.border,
    borderWidth: 1,
    zIndex: 2,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 4,
    backgroundColor: colors.surfaceElev,
    borderColor: colors.neonGreen,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  name: { color: colors.textPrimary, fontSize: 22, fontWeight: "700" },
  email: { color: colors.textSecondary, marginTop: 2, fontSize: 12 },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 6,
  },
  tierPro: { backgroundColor: colors.neonGreen },
  tierStudent: { borderWidth: 1, borderColor: colors.neonGreen },
  tierText: { fontWeight: "800", letterSpacing: 0.4, fontSize: 11, marginLeft: 4 },
  themeQuickRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md, gap: 8 },
  themeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElev,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeSwatchDot: { width: 10, height: 10, borderRadius: radius.pill },
  themeChipText: { color: colors.textPrimary, fontWeight: "700", letterSpacing: 0.4, fontSize: 12, marginHorizontal: 4 },
  modeChip: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElev,
    borderWidth: 1,
    borderColor: colors.border,
  },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.neonGreen,
    borderWidth: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    ...colors.cardShadow,
  },
  upgradeTitle: { color: colors.neonGreen, fontWeight: "800", letterSpacing: 0.4, fontSize: 13 },
  upgradeDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...colors.cardShadow,
  },
  sectionTitle: { color: colors.cyan, letterSpacing: 1, fontSize: 11, fontWeight: "800", marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  rowTitle: { color: colors.textPrimary, fontWeight: "600" },
  rowSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  kvKey: { color: colors.textSecondary },
  kvVal: { color: colors.textPrimary, fontFamily: "Courier", fontSize: 12 },
  signOutBtn: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 14,
    gap: 8,
    borderRadius: radius.md,
  },
  signOutText: { color: colors.danger, fontWeight: "800", letterSpacing: 0.4, marginLeft: 6 },
  settingsBtn: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    ...colors.cardShadow,
  },
  settingsBtnText: { color: colors.textPrimary, fontWeight: "800", letterSpacing: 0.4, marginLeft: 6 },
  modalRoot: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  modalCard: {
    width: "88%",
    maxWidth: 440,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.xl,
    ...colors.cardShadow,
  },
  modalTitle: { color: colors.textPrimary, fontWeight: "800", letterSpacing: 1, fontSize: 16, marginBottom: spacing.lg },
  modalLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginTop: 6,
    fontSize: 15,
  },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { color: colors.textPrimary, fontWeight: "700", letterSpacing: 0.4 },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.neonGreen,
  },
  modalSaveText: { fontWeight: "800", letterSpacing: 0.4 },
});
