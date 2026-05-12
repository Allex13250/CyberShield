import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Lab, LabInstance } from "../../src/api";
import { spacing, radius } from "../../src/theme";
import { useTheme } from "../../src/themeContext";

export default function LabDetail() {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [lab, setLab] = useState<Lab | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flag, setFlag] = useState("");
  const [logs, setLogs] = useState<string[]>(["// awaiting instance..."]);
  const cursorAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [cursorAnim]);

  const fetchLab = useCallback(async () => {
    try {
      const res = await api.get<Lab>(`/labs/${id}`);
      setLab(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchLab();
    }, [fetchLab])
  );

  function pushLog(line: string) {
    setLogs((prev) => [...prev.slice(-40), line]);
  }

  async function startLab() {
    if (!lab) return;
    if (lab.locked) {
      Alert.alert("Upgrade required", "This lab is for Professional tier operators only.", [
        { text: "Cancel", style: "cancel" },
        { text: "Upgrade", onPress: () => router.push("/subscription") },
      ]);
      return;
    }
    setBusy(true);
    pushLog("$ docker run --rm -it " + lab.docker_image);
    try {
      const res = await api.post<{ instance: LabInstance }>(`/labs/${lab.id}/start`);
      pushLog("✓ container started → " + res.data.instance.container_id);
      pushLog(`✓ network → ${res.data.instance.ip}:${res.data.instance.port}`);
      pushLog("✓ status: RUNNING");
      setLab({ ...lab, instance: res.data.instance });
    } catch (err: any) {
      pushLog("✗ " + (err?.response?.data?.detail || "failed to start"));
      Alert.alert("Start failed", err?.response?.data?.detail || "Unable to start");
    } finally {
      setBusy(false);
    }
  }

  async function stopLab() {
    if (!lab) return;
    setBusy(true);
    pushLog("$ docker stop " + (lab.instance?.container_id || ""));
    try {
      await api.post(`/labs/${lab.id}/stop`);
      pushLog("✓ container terminated");
      setLab({ ...lab, instance: null });
    } catch (err: any) {
      pushLog("✗ " + (err?.response?.data?.detail || "failed to stop"));
    } finally {
      setBusy(false);
    }
  }

  async function resetLab() {
    if (!lab) return;
    setBusy(true);
    pushLog("$ docker restart " + (lab.instance?.container_id || ""));
    try {
      const res = await api.post<{ instance: LabInstance }>(`/labs/${lab.id}/reset`);
      pushLog("✓ container restarted → " + res.data.instance.container_id);
      setLab({ ...lab, instance: res.data.instance });
    } catch (err: any) {
      pushLog("✗ " + (err?.response?.data?.detail || "failed to reset"));
    } finally {
      setBusy(false);
    }
  }

  async function submitFlag() {
    if (!lab) return;
    if (!flag.trim()) {
      Alert.alert("Empty flag", "Enter the flag you captured.");
      return;
    }
    setBusy(true);
    pushLog(`$ ./submit_flag --flag "${flag.trim()}"`);
    try {
      const res = await api.post("/labs/submit-flag", { lab_id: lab.id, flag });
      if (res.data.correct) {
        pushLog(`✓ FLAG ACCEPTED · +${res.data.points} pts`);
        Alert.alert("FLAG CAPTURED", `+${res.data.points} points for ${res.data.lab_title}`);
        setLab({ ...lab, completed: true });
        setFlag("");
      } else {
        pushLog("✗ flag rejected — try again");
        Alert.alert("Wrong flag", "Keep digging. The flag format is CSHIELD{...}");
      }
    } catch (err: any) {
      pushLog("✗ " + (err?.response?.data?.detail || "failed to submit"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !lab) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.neonGreen} />
      </View>
    );
  }

  const running = lab.instance && lab.instance.status === "running";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: lab.thumbnail }} style={styles.hero} resizeMode="cover" />
          <View style={styles.heroOverlay} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroCategory}>{lab.category.toUpperCase()}</Text>
            <Text style={styles.heroTitle}>{lab.title}</Text>
            <View style={{ flexDirection: "row", marginTop: 6, gap: 8, alignItems: "center" }}>
              <View style={[styles.pill, { borderColor: colors.neonGreen }]}>
                <Text style={[styles.pillText, { color: colors.neonGreen }]}>{lab.points} PTS</Text>
              </View>
              <View
                style={[
                  styles.pill,
                  { borderColor: lab.difficulty === "easy" ? colors.neonGreen : lab.difficulty === "medium" ? colors.warning : colors.danger },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: lab.difficulty === "easy" ? colors.neonGreen : lab.difficulty === "medium" ? colors.warning : colors.danger },
                  ]}
                >
                  {lab.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>BRIEFING</Text>
          <Text style={styles.briefing}>{lab.long_description}</Text>
          <Text style={styles.imageRow}>
            <Text style={styles.imageKey}>image: </Text>
            <Text style={styles.imageVal}>{lab.docker_image}</Text>
          </Text>
        </View>

        <View style={styles.terminal}>
          <View style={styles.terminalHeader}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <View style={[styles.dot, { backgroundColor: colors.warning }]} />
            <View style={[styles.dot, { backgroundColor: colors.neonGreen }]} />
            <Text style={styles.terminalTitle}>root@cybershield:~#</Text>
          </View>
          <ScrollView style={{ maxHeight: 220 }}>
            {logs.map((l, i) => (
              <Text key={i} style={styles.terminalLine}>{l}</Text>
            ))}
            <Animated.Text style={[styles.terminalCursor, { opacity: cursorAnim }]}>█</Animated.Text>
          </ScrollView>
        </View>

        {running ? (
          <View style={styles.actionsRow}>
            <ActionBtn
              testID="lab-stop-btn"
              label="STOP"
              color={colors.danger}
              icon="stop"
              onPress={stopLab}
              disabled={busy}
            />
            <ActionBtn
              testID="lab-reset-btn"
              label="RESET"
              color={colors.warning}
              icon="refresh"
              onPress={resetLab}
              disabled={busy}
            />
          </View>
        ) : (
          <TouchableOpacity
            testID="lab-start-btn"
            style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
            onPress={startLab}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryBtnText}>{">_ DEPLOY CONTAINER"}</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>SUBMIT_FLAG</Text>
          <View style={styles.flagRow}>
            <Text style={styles.flagPrompt}>root@cs:~#</Text>
            <TextInput
              testID="flag-input"
              style={styles.flagInput}
              placeholder="CSHIELD{...}"
              placeholderTextColor={colors.textMuted}
              value={flag}
              onChangeText={setFlag}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            testID="flag-submit-btn"
            style={[styles.submitBtn, (busy || !flag.trim()) && { opacity: 0.6 }]}
            onPress={submitFlag}
            disabled={busy || !flag.trim()}
          >
            <Ionicons name="flag" color="#000" size={16} />
            <Text style={styles.submitBtnText}>SUBMIT FLAG</Text>
          </TouchableOpacity>
        </View>

        {lab.completed && (
          <View style={styles.completedBanner}>
            <Ionicons name="trophy" color={colors.neonGreen} size={18} />
            <Text style={styles.completedText}>LAB CAPTURED · {lab.points} POINTS BANKED</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ActionBtn({
  label, color, icon, onPress, disabled, testID,
}: { label: string; color: string; icon: any; onPress: () => void; disabled?: boolean; testID?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.actionBtn, { borderColor: color }, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const _stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heroWrap: { height: 200, position: "relative", borderRadius: radius.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  hero: { width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,5,5,0.55)" },
  heroInfo: { position: "absolute", bottom: spacing.md, left: spacing.md, right: spacing.md },
  heroCategory: { color: colors.cyan, letterSpacing: 3, fontWeight: "800", fontSize: 11 },
  heroTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: "800", marginTop: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  pillText: { fontSize: 10, fontWeight: "800", letterSpacing: 2, fontFamily: "Courier" },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    borderRadius: radius.sm,
  },
  sectionLabel: { color: colors.cyan, letterSpacing: 3, fontWeight: "800", fontSize: 11, marginBottom: spacing.sm },
  briefing: { color: colors.textPrimary, lineHeight: 22 },
  imageRow: { color: colors.textSecondary, marginTop: spacing.md, fontFamily: "Courier", fontSize: 12 },
  imageKey: { color: colors.textMuted },
  imageVal: { color: colors.neonGreen },
  terminal: {
    marginTop: spacing.lg,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: colors.neonGreen,
    padding: spacing.md,
    borderRadius: 0,
  },
  terminalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    marginBottom: 6,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  terminalTitle: { color: colors.textSecondary, fontFamily: "Courier", marginLeft: 6, fontSize: 12 },
  terminalLine: { color: colors.neonGreen, fontFamily: "Courier", fontSize: 12, lineHeight: 18 },
  terminalCursor: { color: colors.neonGreen, fontFamily: "Courier", fontSize: 12 },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.neonGreen,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  primaryBtnText: { color: "#000", fontWeight: "800", letterSpacing: 2 },
  actionsRow: { flexDirection: "row", marginTop: spacing.lg, gap: spacing.md },
  actionBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 13, borderWidth: 1, gap: 6 },
  actionBtnText: { fontWeight: "800", letterSpacing: 2, marginLeft: 6 },
  flagRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: colors.cyan,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  flagPrompt: { color: colors.cyan, fontFamily: "Courier", marginRight: 6 },
  flagInput: { flex: 1, color: colors.neonGreen, fontFamily: "Courier", fontSize: 14 },
  submitBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.neonGreen,
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.sm,
  },
  submitBtnText: { color: "#000", fontWeight: "800", letterSpacing: 2, marginLeft: 6 },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderColor: colors.neonGreen,
    borderWidth: 1,
    backgroundColor: colors.neonGreenSoft,
  },
  completedText: { color: colors.neonGreen, fontWeight: "800", letterSpacing: 2, marginLeft: 6, fontSize: 12 },
});
