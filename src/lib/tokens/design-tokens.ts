/**
 * AdTruck Design System tokens — portable module.
 * Source of truth: anti_gravity/tokens/design-tokens.ts v1.0
 *
 * Used by both Tailwind (via CSS custom properties) and components directly.
 */

// ─── Background Layers ───────────────────────────────────────
export const colors = {
  bg: {
    base: '#0F0F14',
    surface: '#1A1A24',
    surfaceRaised: '#222232',
    surfaceHover: '#2A2A3A',
    input: '#16161F',
  },

  text: {
    primary: '#EAEAF0',
    secondary: '#9A9AB0',
    tertiary: '#5E5E78',
    inverse: '#0F0F14',
  },

  accent: {
    primary: '#8B7BF4',
    primaryHover: '#9D8FF7',
    muted: '#8B7BF420',   // 12% opacity
    subtle: '#8B7BF410',  //  6% opacity
  },

  status: {
    success: '#4ADE80',
    successBg: '#4ADE8015',
    warning: '#FBBF24',
    warningBg: '#FBBF2415',
    error: '#F87171',
    errorBg: '#F8717115',
    info: '#60A5FA',
    infoBg: '#60A5FA15',
  },

  border: {
    subtle: '#FFFFFF08',  // 3% white
    default: '#FFFFFF12', // 7% white
    focus: '#8B7BF480',   // 50% accent
  },
} as const;

// ─── Chart Color Palette ─────────────────────────────────────
// Derived from the design system — consistent across all charts.
// Single-color values (work well in both light and dark).
export const chartColors = {
  revenue: 'hsl(152, 60%, 53%)',     // status.success family
  cost: 'hsl(217, 60%, 55%)',        // info family
  profit: 'hsl(259, 60%, 55%)',      // accent family
  profitNeg: 'hsl(0, 65%, 55%)',     // error family
  internalCost: 'hsl(38, 80%, 55%)', // warning family
  clients: 'hsl(152, 60%, 53%)',     // revenue green
  drivers: 'hsl(217, 60%, 55%)',     // cost blue
} as const;

// Per-theme chart colors for shadcn ChartConfig `theme` property.
// Light: slightly deeper/saturated. Dark: brighter for contrast on dark bg.
export const chartThemeColors = {
  revenue:      { light: 'hsl(152, 55%, 42%)', dark: 'hsl(152, 60%, 55%)' },
  cost:         { light: 'hsl(217, 55%, 48%)', dark: 'hsl(217, 60%, 60%)' },
  profit:       { light: 'hsl(259, 55%, 50%)', dark: 'hsl(259, 60%, 62%)' },
  profitNeg:    { light: 'hsl(0, 60%, 48%)',   dark: 'hsl(0, 65%, 58%)' },
  internalCost: { light: 'hsl(38, 75%, 48%)',  dark: 'hsl(38, 80%, 58%)' },
  clients:      { light: 'hsl(152, 55%, 42%)', dark: 'hsl(152, 60%, 55%)' },
  drivers:      { light: 'hsl(217, 55%, 48%)', dark: 'hsl(217, 60%, 60%)' },
} as const;

// ─── Typography ──────────────────────────────────────────────
export const typography = {
  display:       { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.3 },
  titleLg:       { fontSize: 22, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.2 },
  title:         { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, letterSpacing: -0.1 },
  bodyLg:        { fontSize: 16, fontWeight: '400' as const, lineHeight: 22, letterSpacing: 0 },
  body:          { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  bodyMedium:    { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0 },
  caption:       { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0.1 },
  captionMedium: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.2 },
  overline:      { fontSize: 10, fontWeight: '600' as const, lineHeight: 14, letterSpacing: 0.8 },
} as const;

// ─── Spacing (4px grid) ─────────────────────────────────────
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ─── Radius ──────────────────────────────────────────────────
export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   18,
  full: 999,
} as const;

// ─── Icon Sizes ──────────────────────────────────────────────
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

// ─── Aggregate export ────────────────────────────────────────
export const designTokens = {
  colors,
  chartColors,
  chartThemeColors,
  typography,
  spacing,
  radius,
  iconSize,
} as const;
