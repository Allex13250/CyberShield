import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Lab } from "../../src/api";
import { spacing, radius } from "../../src/theme";
import { useTheme } from "../../src/themeContext";

function difficultyColor(colors: any, d: string) {
  if (d === "easy") return colors.neonGreen;
  if (d === "medium") return colors.warning;
  return colors.danger;
}

export default function LabsCatalog() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => _stylesFactory(colors), [colors]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/labs");
      setLabs(res.data.labs);
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

  function renderItem({ item }: { item: Lab }) {
    const running = item.instance && item.instance.status === "running";
    return (
      <TouchableOpacity
        testID={`lab-card-${item.slug}`}
        style={styles.card}
        onPress={() => router.push(`/lab/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.thumbWrap}>
          <Image source={{ uri: item.thumbnail }} style={styles.thumb} resizeMode="cover" />
          <View style={[styles.diffBadge, { borderColor: difficultyColor(colors, item.difficulty) }]}>
            <Text style={[styles.diffText, { color: difficultyColor(colors, item.difficulty) }]}>
              [ {item.difficulty.toUpperCase()} ]
            </Text>
          </View>
          {item.completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.neonGreen} />
              <Text style={styles.completedText}>SOLVED</Text>
            </View>
          )}
          {item.locked && (
            <View style={styles.lockedOverlay}>
              <Ionicons name="lock-closed" size={28} color={colors.warning} />
              <Text style={styles.lockedText}>PROFESSIONAL TIER</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.category}>{item.category.toUpperCase()}</Text>
            <Text style={styles.points}>{item.points} PTS</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>

          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: running ? colors.neonGreen : colors.textMuted },
                ]}
              />
              <Text style={styles.statusText}>
                {running ? "INSTANCE LIVE" : "OFFLINE"}
              </Text>
            </View>
            <View style={styles.deployBtn} testID={`deploy-${item.slug}`}>
              <Text style={styles.deployText}>{running ? "OPEN >" : "DEPLOY >"}</Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round((item.progress ?? 0) * 100)}%`,
                    backgroundColor: item.completed ? colors.neonGreen : colors.cyan,
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>
                {item.completed
                  ? "COMPLETED"
                  : `${item.attempts ?? 0} ATTEMPT${(item.attempts ?? 0) === 1 ? "" : "S"}`}
              </Text>
              <Text style={styles.progressText}>{Math.round((item.progress ?? 0) * 100)}%</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.neonGreen} />
        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
          // fetching lab manifest...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="labs-screen">
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={labs}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
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
      />
    </View>
  );
}

const _stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: "hidden",
    ...colors.cardShadow
  },
  thumbWrap: { height: 140, position: "relative", backgroundColor: "#000" },
  thumb: { width: "100%", height: "100%", opacity: 0.85 },
  diffBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  diffText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  completedBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  completedText: { color: colors.neonGreen, fontSize: 10, fontWeight: "800", letterSpacing: 0.4, marginLeft: 4 },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,5,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedText: { color: colors.warning, marginTop: 6, fontWeight: "800", letterSpacing: 0.4, fontSize: 11 },
  body: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  category: { color: colors.cyan, fontSize: 11, letterSpacing: 1, fontWeight: "800" },
  points: { color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 6 },
  desc: { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  statusRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusLeft: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4, fontWeight: "700" },
  deployBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.neonGreen },
  deployText: { color: colors.neonGreen, fontWeight: "800", letterSpacing: 0.4, fontSize: 12 },
  progressWrap: { marginTop: 10 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceElev,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  progressText: { color: colors.textMuted, fontSize: 10, letterSpacing: 0.4, fontWeight: "700" },
});
