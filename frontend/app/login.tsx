import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "../src/auth";
import { spacing, radius } from "../src/theme";
import { useTheme } from "../src/themeContext";

const HERO =
  "https://static.prod-images.emergentagent.com/jobs/bab84aa9-5bbd-4317-baf4-40788a8ec1c6/images/a36df35f73d085b422c0ce5ed19260c9f7f2938db3916ed30e74c4a3c72a08e4.png";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "web") return;
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(compatible && enrolled);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!authLoading && user) router.replace("/(tabs)");
  }, [authLoading, user]);

  async function handleLogin(emailOverride?: string, passOverride?: string) {
    const e = (emailOverride || email).trim();
    const p = passOverride || password;
    if (!e || !p) {
      Alert.alert("Missing credentials", "Enter email and password");
      return;
    }
    setLoading(true);
    try {
      await signIn(e, p);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Auth failed", err?.response?.data?.detail || "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to CyberShield",
        cancelLabel: "Cancel",
      });
      if (res.success) {
        Alert.alert("Biometric verified", "Now enter your credentials to continue.");
      }
    } catch (err: any) {
      Alert.alert("Biometric error", err?.message || "Failed");
    }
  }

  function fillDemo() {
    setEmail("student@cybershield.io");
    setPassword("Student@123");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.heroWrap}>
          <Image source={{ uri: HERO }} style={styles.hero} resizeMode="cover" />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.brand}>
              CYBER<Text style={{ color: colors.neonGreen }}>SHIELD</Text>
            </Text>
            <Text style={styles.tagline}>Hands-on cybersecurity labs, on demand.</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>EMAIL</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prompt}>{">"}</Text>
            <TextInput
              testID="login-email-input"
              style={styles.input}
              placeholder="operator@cybershield.io"
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
              testID="login-password-input"
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            testID="login-submit-btn"
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={() => handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryBtnText}>{">_ AUTHENTICATE"}</Text>
            )}
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity
              testID="login-biometric-btn"
              style={styles.outlineBtn}
              onPress={handleBiometric}
            >
              <Ionicons name="finger-print" size={18} color={colors.cyan} />
              <Text style={styles.outlineBtnText}>UNLOCK WITH BIOMETRIC</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity testID="fill-demo-btn" onPress={fillDemo} style={{ marginTop: spacing.lg }}>
            <Text style={styles.ghostText}>$ load demo_credentials.sh</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl }}>
            <Text style={styles.muted}>{"No agent profile? "}</Text>
            <TouchableOpacity
              testID="go-register-btn"
              onPress={() => router.push("/register")}
            >
              <Text style={styles.link}>REGISTER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const _stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxl },
  heroWrap: { height: 280, position: "relative", borderBottomWidth: 1, borderBottomColor: colors.border },
  hero: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,5,0.55)",
  },
  heroContent: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
  },
  brand: { fontSize: 36, color: colors.textPrimary, fontWeight: "800", letterSpacing: 4 },
  tagline: { color: colors.textSecondary, marginTop: 6, fontFamily: "Courier" },
  formCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  label: { color: colors.textSecondary, fontSize: 11, letterSpacing: 3, fontWeight: "700" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 6,
  },
  prompt: { color: colors.neonGreen, fontFamily: "Courier", marginRight: 8 },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 10,
    fontFamily: "Courier",
    fontSize: 15,
  },
  primaryBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.neonGreen,
    paddingVertical: 14,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  primaryBtnText: { color: "#000", fontWeight: "800", letterSpacing: 2 },
  outlineBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  outlineBtnText: { color: colors.cyan, fontWeight: "700", letterSpacing: 2, marginLeft: 8 },
  ghostText: { color: colors.textMuted, fontFamily: "Courier", textAlign: "center" },
  muted: { color: colors.textSecondary },
  link: { color: colors.neonGreen, fontWeight: "700", letterSpacing: 2 },
});
