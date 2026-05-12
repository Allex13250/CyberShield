// Theme registry derived from user-provided CSS variables.
// Each theme provides a light + dark palette; we compute soft / muted variants in code.

export type ColorPalette = {
  bg: string;
  surface: string;
  surfaceElev: string;
  terminal: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  terminalText: string;
  neonGreen: string;      // primary accent (CTA)
  neonGreenSoft: string;
  neonGreenGlow: string;
  cyan: string;           // secondary accent
  cyanSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  border: string;
  borderActive: string;
  onPrimary: string;      // contrasting text on neonGreen buttons
  scrim: string;          // overlay over hero images
};

export type ThemeMode = "light" | "dark";

export type ThemeDef = {
  id: string;
  name: string;
  light: ColorPalette;
  dark: ColorPalette;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const parseRgb = (c: string): [number, number, number] => {
  const m = c.match(/\d+/g);
  if (!m || m.length < 3) return [0, 0, 0];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
};

const mix = (a: [number, number, number], b: [number, number, number], r: number) =>
  `rgb(${Math.round(a[0] * (1 - r) + b[0] * r)}, ${Math.round(
    a[1] * (1 - r) + b[1] * r
  )}, ${Math.round(a[2] * (1 - r) + b[2] * r)})`;

const alpha = (c: [number, number, number], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

const luminance = (c: [number, number, number]) =>
  (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255;

type Input = {
  text: string;
  background: string;
  primary: string;
  secondary: string;
  accent: string;
};

const buildPalette = (input: Input, mode: ThemeMode): ColorPalette => {
  const t = parseRgb(input.text);
  const b = parseRgb(input.background);
  const p = parseRgb(input.primary);
  const a = parseRgb(input.accent);

  const onPrimary = luminance(p) > 0.55 ? "#000000" : "#FFFFFF";

  // Light mode: dim secondary/muted more aggressively for legibility
  const secondaryMix = mode === "light" ? 0.55 : 0.4;
  const mutedMix = mode === "light" ? 0.78 : 0.65;

  // Use primary for section labels instead of bright accent (more readable on light)
  const sectionAccent = mode === "light" && luminance(a) > 0.5 ? input.primary : input.accent;

  return {
    bg: input.background,
    surface: mix(b, t, mode === "light" ? 0.025 : 0.04),
    surfaceElev: mix(b, t, mode === "light" ? 0.06 : 0.08),
    terminal: mode === "dark" ? "rgb(0, 0, 0)" : mix(b, t, 0.92),
    textPrimary: input.text,
    textSecondary: mix(t, b, secondaryMix),
    textMuted: mix(t, b, mutedMix),
    terminalText: mode === "dark" ? input.primary : "#E6EDF3",
    neonGreen: input.primary,
    neonGreenSoft: alpha(p, 0.18),
    neonGreenGlow: alpha(p, 0.35),
    cyan: sectionAccent,
    cyanSoft: alpha(a, 0.18),
    danger: "#FF3B30",
    dangerSoft: "rgba(255, 59, 48, 0.18)",
    warning: "#FF9F0A",
    border: mix(b, t, mode === "light" ? 0.10 : 0.14),
    borderActive: input.primary,
    onPrimary,
    scrim: mode === "dark" ? "rgba(5, 5, 5, 0.55)" : "rgba(0, 0, 0, 0.35)",
  };
};

const makeTheme = (id: string, name: string, light: Input, dark: Input): ThemeDef => ({
  id,
  name,
  light: buildPalette(light, "light"),
  dark: buildPalette(dark, "dark"),
});

// -----------------------------------------------------------------------------
// Themes (7 palettes × light + dark) — palettes provided by the user
// -----------------------------------------------------------------------------
export const THEMES: ThemeDef[] = [
  makeTheme(
    "synth",
    "SYNTHWAVE",
    {
      text: "rgb(2, 13, 5)",
      background: "rgb(240, 253, 242)",
      primary: "rgb(43, 229, 74)",
      secondary: "rgb(169, 129, 239)",
      accent: "rgb(234, 89, 235)",
    },
    {
      text: "rgb(242, 253, 245)",
      background: "rgb(2, 13, 4)",
      primary: "rgb(26, 213, 58)",
      secondary: "rgb(57, 16, 126)",
      accent: "rgb(163, 20, 163)",
    }
  ),
  makeTheme(
    "forest",
    "FOREST",
    {
      text: "rgb(24, 31, 10)",
      background: "rgb(242, 248, 232)",
      primary: "rgb(75, 102, 30)",
      secondary: "rgb(138, 219, 143)",
      accent: "rgb(55, 179, 90)",
    },
    {
      text: "rgb(237, 245, 222)",
      background: "rgb(17, 23, 7)",
      primary: "rgb(196, 224, 152)",
      secondary: "rgb(36, 118, 41)",
      accent: "rgb(74, 200, 109)",
    }
  ),
  makeTheme(
    "bloom",
    "BLOOM",
    {
      text: "rgb(13, 5, 11)",
      background: "rgb(253, 249, 251)",
      primary: "rgb(188, 86, 148)",
      secondary: "rgb(203, 217, 160)",
      accent: "rgb(144, 204, 127)",
    },
    {
      text: "rgb(249, 240, 247)",
      background: "rgb(8, 3, 5)",
      primary: "rgb(168, 67, 127)",
      secondary: "rgb(81, 95, 38)",
      accent: "rgb(68, 128, 51)",
    }
  ),
  makeTheme(
    "iris",
    "IRIS",
    {
      text: "rgb(14, 12, 20)",
      background: "rgb(243, 241, 249)",
      primary: "rgb(99, 73, 185)",
      secondary: "rgb(159, 141, 220)",
      accent: "rgb(121, 93, 217)",
    },
    {
      text: "rgb(238, 236, 244)",
      background: "rgb(8, 6, 14)",
      primary: "rgb(96, 70, 180)",
      secondary: "rgb(53, 35, 113)",
      accent: "rgb(67, 38, 161)",
    }
  ),
  makeTheme(
    "azure",
    "AZURE",
    {
      text: "rgb(4, 10, 13)",
      background: "rgb(250, 252, 253)",
      primary: "rgb(73, 156, 202)",
      secondary: "rgb(203, 155, 226)",
      accent: "rgb(209, 99, 201)",
    },
    {
      text: "rgb(243, 249, 251)",
      background: "rgb(1, 3, 4)",
      primary: "rgb(53, 137, 182)",
      secondary: "rgb(77, 29, 99)",
      accent: "rgb(157, 47, 150)",
    }
  ),
  makeTheme(
    "inferno",
    "INFERNO",
    {
      text: "rgb(37, 10, 0)",
      background: "rgb(255, 246, 243)",
      primary: "rgb(255, 99, 17)",
      secondary: "rgb(255, 234, 107)",
      accent: "rgb(254, 255, 55)",
    },
    {
      text: "rgb(255, 229, 219)",
      background: "rgb(10, 3, 0)",
      primary: "rgb(240, 84, 0)",
      secondary: "rgb(148, 126, 0)",
      accent: "rgb(199, 199, 0)",
    }
  ),
  makeTheme(
    "lime",
    "LIME",
    {
      text: "rgb(14, 18, 7)",
      background: "rgb(247, 250, 241)",
      primary: "rgb(145, 190, 82)",
      secondary: "rgb(144, 214, 168)",
      accent: "rgb(110, 201, 177)",
    },
    {
      text: "rgb(244, 248, 237)",
      background: "rgb(12, 15, 5)",
      primary: "rgb(129, 174, 66)",
      secondary: "rgb(41, 112, 66)",
      accent: "rgb(54, 145, 121)",
    }
  ),
];

export const DEFAULT_THEME_ID = "synth";
export const DEFAULT_MODE: ThemeMode = "dark";

export function getPalette(themeId: string, mode: ThemeMode): ColorPalette {
  const t = THEMES.find((th) => th.id === themeId) ?? THEMES[0];
  return mode === "dark" ? t.dark : t.light;
}
