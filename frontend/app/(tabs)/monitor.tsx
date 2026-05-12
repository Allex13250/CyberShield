import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import Svg, { Polyline, Line, Rect } from "react-native-svg";
import { api, ServerMetrics } from "../../src/api";
import { spacing, radius } from "../../src/theme";
import { useTheme } from "../../src/themeContext";

const { width } = Dimensions.get("window");
const CHART_W = width - spacing.lg * 2 - spacing.lg * 2;
const CHART_H = 140;

function buildLine(data: { t: number; cpu: number; ram: number }[], key: "cpu" | "ram") {
  if (data.length === 0) return "";
  const max = 100;
  const stepX = CHART_W / Math.max(1, data.length - 1);
  return data
    .map((p, i) => {
      const x = i * stepX;
      const y = CHART_H - (Math.min(max, Math.max(0, p[key])) / max) * CHART_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function formatUptime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

export default function MonitorTab() {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  const [m, setM] = useState<ServerMetrics | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await api.get<ServerMetrics>("/metrics/server");
        if (alive) setM(res.data);
      } catch {}
    }
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }} testID="monitor-screen">
      <Text style={styles.sectionLabel}>// LIVE INFRASTRUCTURE TELEMETRY</Text>

      <View style={styles.statsGrid}>
        <Stat label="CPU" value={m ? `${m.cpu_percent}%` : "--"} color={colors.neonGreen} testID="metric-cpu" />
        <Stat label="RAM" value={m ? `${m.ram_percent}%` : "--"} color={colors.cyan} testID="metric-ram" />
        <Stat
          label="NET IN"
          value={m ? `${m.network_in_kbps.toFixed(0)} kb/s` : "--"}
          color={colors.warning}
          testID="metric-net-in"
        />
        <Stat
          label="NET OUT"
          value={m ? `${m.network_out_kbps.toFixed(0)} kb/s` : "--"}
          color={colors.danger}
          testID="metric-net-out"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>CPU & MEMORY ─ 150s WINDOW</Text>
        <View style={styles.chartWrap}>
          <Svg width={CHART_W} height={CHART_H}>
            <Rect x={0} y={0} width={CHART_W} height={CHART_H} fill="#000" />
            {[0.25, 0.5, 0.75].map((p) => (
              <Line
                key={p}
                x1={0}
                x2={CHART_W}
                y1={CHART_H * p}
                y2={CHART_H * p}
                stroke={colors.border}
                strokeDasharray="2 4"
                strokeWidth={0.5}
              />
            ))}
            {m && (
              <>
                <Polyline
                  points={buildLine(m.history, "cpu")}
                  fill="none"
                  stroke={colors.neonGreen}
                  strokeWidth={2}
                />
                <Polyline
                  points={buildLine(m.history, "ram")}
                  fill="none"
                  stroke={colors.cyan}
                  strokeWidth={2}
                />
              </>
            )}
          </Svg>
        </View>
        <View style={styles.legendRow}>
          <Legend color={colors.neonGreen} label="CPU" />
          <Legend color={colors.cyan} label="MEMORY" />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>HOST STATUS</Text>
        <KV k="Running containers" v={m ? `${m.running_containers}` : "--"} testID="metric-containers" />
        <KV k="Total operators" v={m ? `${m.total_users}` : "--"} testID="metric-users" />
        <KV k="Uptime" v={m ? formatUptime(m.uptime_seconds) : "--"} />
        <KV k="Orchestrator" v="Docker Engine 25.0.3" />
        <KV k="Region" v="cs-edge-eu-west-1" />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, color, testID }: { label: string; value: string; color: string; testID?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]} testID={testID}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: spacing.lg }}>
      <View style={{ width: 12, height: 2, backgroundColor: color, marginRight: 6 }} />
      <Text style={{ color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function KV({ k, v, testID }: { k: string; v: string; testID?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  return (
    <View style={styles.kv} testID={testID}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

const _stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { color: colors.textSecondary, marginBottom: spacing.md },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: spacing.lg,
    borderRadius: radius.sm,
    ...colors.cardShadow
  },
  statLabel: { color: colors.textSecondary, letterSpacing: 1, fontSize: 11, fontWeight: "700" },
  statValue: { fontSize: 26, fontWeight: "800", marginTop: 4, fontFamily: "Courier" },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...colors.cardShadow
  },
  cardTitle: { color: colors.cyan, fontSize: 11, letterSpacing: 1, fontWeight: "800", marginBottom: spacing.md },
  chartWrap: { backgroundColor: "#000", padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.neonGreen },
  legendRow: { flexDirection: "row", marginTop: spacing.md },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  kvKey: { color: colors.textSecondary },
  kvVal: { color: colors.textPrimary, fontFamily: "Courier", fontSize: 12 },
});
