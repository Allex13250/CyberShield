import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/auth";
import { spacing, radius } from "../src/theme";
import { useTheme } from "../src/themeContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email.trim() || !password || !fullName.trim()) {
      Alert.alert("Missing fields", "All fields are required");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim());
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Registration failed", err?.response?.data?.detail || "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        <Text style={styles.title}>CREATE PROFILE</Text>
        <Text style={styles.subtitle}>// Spin up your operator account</Text>

        <View style={styles.card}>
          <Text style={styles.label}>FULL NAME</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prompt}>{"@"}</Text>
            <TextInput
              testID="register-name-input"
              style={styles.input}
              placeholder="Agent Alpha"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>EMAIL</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prompt}>{">"}</Text>
            <TextInput
              testID="register-email-input"
              style={styles.input}
              placeholder="agent@cybershield.io"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>PASSWORD</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prompt}>{"#"}</Text>
            <TextInput
              testID="register-password-input"
              style={styles.input}
              placeholder="min 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            testID="register-submit-btn"
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryBtnText}>{">_ DEPLOY PROFILE"}</Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl }}>
            <Text style={{ color: colors.textSecondary }}>{"Have an account? "}</Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.link}>SIGN IN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const _stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: 64 },
  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  backText: { color: colors.textPrimary, fontWeight: "700", letterSpacing: 0.4, marginLeft: 4 },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: "800", letterSpacing: 1 },
  subtitle: { color: colors.textSecondary, marginTop: 4 },
  card: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    ...colors.cardShadow
  },
  label: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1, fontWeight: "700" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 6,
  },
  prompt: { color: colors.neonGreen, marginRight: 8 },
  input: { flex: 1, color: colors.textPrimary, paddingVertical: 10, fontSize: 15 },
  primaryBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.neonGreen,
    paddingVertical: 14,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  primaryBtnText: { color: "#000", fontWeight: "800", letterSpacing: 0.4 },
  link: { color: colors.neonGreen, fontWeight: "700", letterSpacing: 0.4 },
});
