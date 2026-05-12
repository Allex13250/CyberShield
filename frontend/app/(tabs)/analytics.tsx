import React, { useMemo, useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../../src/api";
import { spacing, radius } from "../../src/theme";
import { useTheme } from "../../src/themeContext";

type Row = {
  lab_id: string;
  title: string;
  category: string;
  difficulty: string;
  starts: number;
  attempts: number;
  successes: number;
  success_rate: number;
};

type LeaderRow = {
  user_id: string;
  full_name: string;
  tier: string;
  points: number;
  solves: number;
};

type Totals = {
  users: number;
  labs: number;
  submissions: number;
  successful_submissions: number;
  active_instances: number;
  professional_users: number;
};

export default function AnalyticsTab() {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/analytics");
      setTotals(res.data.totals);
      setRows(res.data.labs);
      setLeaderboard(res.data.leaderboard);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.neonGreen} />
      </View>
    );
  }

  const maxStarts = Math.max(1, ...rows.map((r) => r.starts));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.neonGreen}
        />
      }
      testID="analytics-screen"
    >
      <Text style={styles.sectionLabel}>// PLATFORM INTEL</Text>

      <View style={styles.statsRow}>
        <Stat label="USERS" value={totals?.users ?? 0} color={colors.neonGreen} />
        <Stat label="LABS" value={totals?.labs ?? 0} color={colors.cyan} />
        <Stat label="ACTIVE" value={totals?.active_instances ?? 0} color={colors.warning} />
      </View>
      <View style={styles.statsRow}>
        <Stat label="SOLVES" value={totals?.successful_submissions ?? 0} color={colors.neonGreen} />
        <Stat label="ATTEMPTS" value={totals?.submissions ?? 0} color={colors.cyan} />
        <Stat label="PRO USERS" value={totals?.professional_users ?? 0} color={colors.warning} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>LAB POPULARITY</Text>
        {rows.length === 0 && <Text style={styles.emptyText}>// no telemetry yet — deploy a lab to start collecting</Text>}
        {rows.map((r) => (
          <View key={r.lab_id} style={styles.popRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.popTitle}>{r.title}</Text>
              <Text style={styles.popMeta}>
                {r.category.toUpperCase()} · {r.difficulty.toUpperCase()} · {r.success_rate}% solved
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(r.starts / maxStarts) * 100}%` },
                  ]}
                />
              </View>
            </View>
            <View style={styles.popCount}>
              <Text style={styles.popCountValue}>{r.starts}</Text>
              <Text style={styles.popCountLabel}>STARTS</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>LEADERBOARD ─ TOP OPERATORS</Text>
        {leaderboard.length === 0 && (
          <Text style={styles.emptyText}>// no solves recorded yet</Text>
        )}
        {leaderboard.map((u, i) => (
          <View key={u.user_id} style={styles.leaderRow}>
            <Text style={styles.rank}>#{String(i + 1).padStart(2, "0")}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.leaderName}>{u.full_name}</Text>
              <Text style={styles.leaderMeta}>
                {u.tier.toUpperCase()} · {u.solves} solves
              </Text>
            </View>
            <Text style={styles.leaderPoints}>{u.points} PTS</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const _stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { color: colors.textSecondary, marginBottom: spacing.md },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderTopWidth: 3,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  statLabel: { color: colors.textSecondary, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  statValue: { fontSize: 22, fontWeight: "800", marginTop: 4, fontFamily: "Courier" },
  card: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  cardTitle: { color: colors.cyan, fontSize: 11, letterSpacing: 1, fontWeight: "800", marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 12 },
  popRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: "center" },
  popTitle: { color: colors.textPrimary, fontWeight: "700" },
  popMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  barTrack: { height: 4, backgroundColor: "#000", marginTop: 6, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.neonGreen },
  popCount: { alignItems: "flex-end", marginLeft: spacing.md },
  popCountValue: { color: colors.neonGreen, fontSize: 18, fontWeight: "800", fontFamily: "Courier" },
  popCountLabel: { color: colors.textMuted, fontSize: 9, letterSpacing: 0.4, fontWeight: "700" },
  leaderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rank: { color: colors.cyan, fontWeight: "800", marginRight: spacing.md, fontFamily: "Courier" },
  leaderName: { color: colors.textPrimary, fontWeight: "700" },
  leaderMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  leaderPoints: { color: colors.neonGreen, fontWeight: "800", fontFamily: "Courier" },
});
