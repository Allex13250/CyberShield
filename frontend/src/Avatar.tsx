import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Ellipse, Defs, ClipPath, G } from "react-native-svg";
import { useTheme } from "./themeContext";

function hash(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Boring-Avatars "beam"-style: clipped circle with a tilted bar + 2 eye dots.
export function Avatar({
  seed,
  size = 72,
  name,
  showInitial = false,
}: {
  seed: string;
  size?: number;
  name?: string;
  showInitial?: boolean;
}) {
  const { colors } = useTheme();
  const { palette, geo } = useMemo(() => {
    const h = hash(seed || "anon");
    const pal = colors.avatarPalette;
    const pick = (i: number) => pal[(h >> (i * 4)) % pal.length];
    const c0 = pick(0);
    const c1 = pick(1);
    const c2 = pick(2);
    const wrapper = pick(3);

    // Geometry derived from hash
    const tilt = ((h % 360) - 180) * 0.5; // -90..90
    const barY = 24 + ((h >> 3) % 22);     // 24..46 (on a 0..80 grid)
    const barH = 26 + ((h >> 6) % 24);     // 26..50
    const eyeOffsetX = ((h >> 9) % 20) - 10;
    const mouthOffsetX = ((h >> 12) % 16) - 8;
    return {
      palette: { c0, c1, c2, wrapper },
      geo: { tilt, barY, barH, eyeOffsetX, mouthOffsetX },
    };
  }, [seed, colors.avatarPalette]);

  const id = `clip-${Math.abs(hash(seed || "anon"))}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 80 80">
        <Defs>
          <ClipPath id={id}>
            <Circle cx="40" cy="40" r="40" />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${id})`}>
          {/* base */}
          <Circle cx="40" cy="40" r="40" fill={palette.wrapper} />
          {/* tilted color bar */}
          <Ellipse
            cx="40"
            cy={geo.barY}
            rx="48"
            ry={geo.barH / 2}
            fill={palette.c0}
            transform={`rotate(${geo.tilt} 40 40)`}
          />
          {/* mouth */}
          <Ellipse
            cx={40 + geo.mouthOffsetX}
            cy={56}
            rx={8}
            ry={3}
            fill={palette.c1}
            opacity={0.85}
          />
          {/* eyes */}
          <Circle cx={28 + geo.eyeOffsetX} cy={32} r={3} fill={palette.c2} />
          <Circle cx={52 + geo.eyeOffsetX} cy={32} r={3} fill={palette.c2} />
        </G>
      </Svg>
      {showInitial && !!name && (
        <View style={[styles.initialWrap, { width: size, height: size }]} pointerEvents="none">
          <Text
            style={{
              color: colors.onPrimary,
              fontSize: size * 0.32,
              fontWeight: "800",
              textShadowColor: "rgba(0,0,0,0.35)",
              textShadowRadius: 4,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  initialWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
});
