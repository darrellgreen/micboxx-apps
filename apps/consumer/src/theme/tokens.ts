/**
 * MicBoxx Mobile design tokens — single source of truth.
 *
 * Derived from the micboxx-web design system (globals.css).
 * Dark mode is the primary (and currently only) mobile theme.
 *
 * Usage: import { tokens } from "@/theme/tokens";
 *        style={{ color: tokens.colors.textPrimary }}
 */
export const tokens = {
  colors: {
    // ── Brand ────────────────────────────────────────────────────────────
    brandPrimary: "#00B3A6",
    brandSecondary: "#79C96B",
    brandTertiary: "#00AFC1",
    brandGradient: ["#79C96B", "#00B3A6", "#00AFC1"] as const,

    // ── Accent ───────────────────────────────────────────────────────────
    accent: "#00B3A6",
    accentStrong: "#00998F",
    secondaryAccent: "#79C96B",
    secondaryAccentHover: "#68B85A",
    accentDim: "rgba(0,179,166,0.16)",
    accentLight: "#D7FFFB",
    accentWarm: "#E6B85C",
    teal: "#00AFC1",
    tealDim: "rgba(0,175,193,0.18)",
    cta: "#00B3A6",
    ctaDim: "rgba(0,179,166,0.16)",
    ctaGlow: "rgba(0,179,166,0.22)",

    // ── Canvas / backgrounds ─────────────────────────────────────────────
    bgApp: "#0D1117",
    bgSurface: "#151B23",
    bgElevated: "#1D2630",
    bgInput: "#1D2630",
    bgInk: "#0A0E14",
    bgSurfaceMuted: "rgba(21,27,35,0.84)",
    canvas: "#0D1117",
    panel: "#151B23",
    panelStrong: "#1D2630",
    panelMuted: "rgba(21,27,35,0.84)",
    panelGlassStrong: "rgba(21,27,35,0.84)",

    // ── Text ─────────────────────────────────────────────────────────────
    textPrimary: "#F7FAFC",
    textSecondary: "#A9B4C0",
    textSoft: "#A9B4C0",
    textMuted: "#666666",
    textDisabled: "rgba(247,250,252,0.30)",
    text: "#F7FAFC",
    textSubtle: "#A9B4C0",

    // ── Borders ──────────────────────────────────────────────────────────
    borderSubtle: "#2A3642",
    borderStrong: "rgba(255,255,255,0.10)",
    border: "#2A3642",
    borderGlass: "rgba(255,255,255,0.10)",
    borderAccent: "rgba(0,179,166,0.35)",
    gridSoft: "rgba(255,255,255,0.08)",

    // ── Semantic ─────────────────────────────────────────────────────────
    success: "#47C27A",
    warning: "#E6B85C",
    danger: "#D95C5C",

    // ── Chart / category accents ─────────────────────────────────────────
    chart1: "#00B3A6",
    chart2: "#79C96B",
    chart3: "#00AFC1",
    chart4: "#a78bfa",
    chart5: "#E6B85C",

    // ── Overlays ─────────────────────────────────────────────────────────
    overlayLight: "rgba(255,255,255,0.06)",
    overlayDark: "rgba(0,0,0,0.55)",
    scrim: "rgba(10,14,20,0.78)",

    // ── Genre accents / legacy compatibility ────────────────────────────
    genreColors: {
      afrobeat: "#E6B85C",
      amapiano: "#00AFC1",
      classical: "#A78BFA",
      country: "#79C96B",
      dancehall: "#00AFC1",
      electronic: "#00AFC1",
      gospel: "#79C96B",
      hiphop: "#E6B85C",
      "hip-hop": "#E6B85C",
      house: "#00B3A6",
      jazz: "#79C96B",
      latin: "#E6B85C",
      pop: "#00B3A6",
      rap: "#E6B85C",
      reggae: "#79C96B",
      rnb: "#A78BFA",
      rock: "#D95C5C",
      soul: "#A78BFA",
    } as const,
  },

  // ── Typography ──────────────────────────────────────────────────────────
  typography: {
    fontFamily: {
      sans: "Roboto",
      mono: "GeistMono",
    },

    // font sizes
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    "2xl": 28,
    "3xl": 34,
    "4xl": 42,

    // font weights (as strings for RN)
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
    black: "900" as const,

    // line heights
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },

  // ── Spacing ─────────────────────────────────────────────────────────────
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
  },

  // ── Radii (exactly aligned to micboxx-web --radius scale) ───────────────
  radii: {
    sm: 7,
    md: 10,
    lg: 12,
    xl: 17,
    "2xl": 22,
    "3xl": 26,
    pill: 999,
  },

  // ── Shadows / elevation ─────────────────────────────────────────────────
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    accent: {
      shadowColor: "#00B3A6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    cta: {
      shadowColor: "#00B3A6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  // ── Tab bar ─────────────────────────────────────────────────────────────
  tabBar: {
    height: 72,
    centerButtonSize: 60,
  },
} as const;

export type Tokens = typeof tokens;
