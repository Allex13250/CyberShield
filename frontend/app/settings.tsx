import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, radius } from "../src/theme";
import { useTheme } from "../src/themeContext";
import { getPalette } from "../src/themes";

export default function SettingsScreen() {
  const { colors, themes, themeId, mode, setTheme, setMode } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }} testID="settings-screen">
      <Text style={styles.sectionLabel}>// APPEARANCE</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>MODE</Text>
        <View style={styles.modeRow}>
          {(["dark", "light"] as const).map((m) => {
            const active = mode === m;
            return (
              <TouchableOpacity
                key={m}
                testID={`mode-${m}-btn`}
                style={[
                  styles.modeBtn,
                  active && { backgroundColor: colors.neonGreen, borderColor: colors.neonGreen },
                ]}
                onPress={() => setMode(m)}
              >
                <Ionicons
                  name={m === "dark" ? "moon" : "sunny"}
                  size={16}
                  color={active ? colors.onPrimary : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.modeText,
                    { color: active ? colors.onPrimary : colors.textPrimary },
                  ]}
                >
                  {m.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>PALETTE</Text>
        <Text style={styles.cardHelp}>// tap a swatch to apply the palette</Text>
        <View style={styles.themesGrid}>
          {themes.map((t) => {
            const preview = getPalette(t.id, mode);
            const active = themeId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                testID={`theme-${t.id}-btn`}
                style={[
                  styles.themeCard,
                  { backgroundColor: preview.bg, borderColor: active ? colors.neonGreen : preview.border },
                ]}
                onPress={() => setTheme(t.id)}
                activeOpacity={0.8}
              >
                <View style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: preview.neonGreen }]} />
                  <View style={[styles.swatch, { backgroundColor: preview.cyan }]} />
                  <View style={[styles.swatch, { backgroundColor: preview.textPrimary }]} />
                </View>
                <Text style={[styles.themeName, { color: preview.textPrimary }]}>{t.name}</Text>
                <Text style={[styles.themeSub, { color: preview.textSecondary }]}>
                  {active ? "// ACTIVE" : "// tap to apply"}
                </Text>
                {active && (
                  <View style={styles.activeBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.neonGreen} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>PREVIEW</Text>
        <View style={styles.previewRow}>
          <TouchableOpacity style={styles.previewPrimary}>
            <Text style={[styles.previewPrimaryText, { color: colors.onPrimary }]}>{">_ PRIMARY"}</Text>
          </TouchableOpacity>
          <View style={styles.previewOutline}>
            <Text style={[styles.previewOutlineText, { color: colors.cyan }]}>SECONDARY</Text>
          </View>
        </View>
        <Text style={styles.previewBody}>
          The quick brown fox jumps over the lazy dog. 0123456789 — CSHIELD{'{theme_loaded}'}
        </Text>
      </View>
    </ScrollView>
  );
}

const _stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { color: colors.textSecondary, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
    ...colors.cardShadow
  },
  cardTitle: { color: colors.cyan, letterSpacing: 1, fontSize: 11, fontWeight: "800", marginBottom: spacing.sm },
  cardHelp: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md },
  modeRow: { flexDirection: "row", gap: spacing.md },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElev,
  },
  modeText: { fontWeight: "800", letterSpacing: 0.4, fontSize: 12, marginLeft: 6 },
  themesGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  themeCard: {
    width: "47%",
    flexGrow: 1,
    flexBasis: "45%",
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    position: "relative",
    ...colors.cardShadow
  },
  swatchRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  swatch: { width: 18, height: 18, borderRadius: 2 },
  themeName: { fontWeight: "800", letterSpacing: 0.4, fontSize: 13 },
  themeSub: { fontSize: 11, marginTop: 4 },
  activeBadge: { position: "absolute", top: 8, right: 8 },
  previewRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  previewPrimary: {
    flex: 1,
    backgroundColor: colors.neonGreen,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  previewPrimaryText: { fontWeight: "800", letterSpacing: 0.4 },
  previewOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cyan,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  previewOutlineText: { fontWeight: "800", letterSpacing: 0.4 },
  previewBody: { color: colors.textSecondary, lineHeight: 20 },
});
