/**
 * Motion design tokens — standalone, portable module.
 * Source: anti_gravity/tokens/motion-tokens.ts
 *
 * Two-tier philosophy:
 *   Mobile → bold & bouncy (spring physics, scale pop)
 *   Web    → calm & precise (smooth easing, subtle transitions)
 */

// ─── Duration scale (seconds, for Framer Motion) ────────────
export const duration = {
  /** Tap feedback, icon pop */
  instant: 0.1,
  /** Button press, toggle switch */
  fast: 0.2,
  /** Navigation bounce, card appear */
  base: 0.35,
  /** Screen transition, modal slide */
  reveal: 0.5,
  /** Confetti, success Lottie */
  celebration: 0.8,
} as const;

// ─── Easing curves ──────────────────────────────────────────
export const easing = {
  /** Expo out — screen enters, content slides up */
  reveal: [0.16, 1, 0.3, 1] as const,
  /** Material standard — web transitions */
  smooth: [0.4, 0, 0.2, 1] as const,
  /** Fast exit — dismissals, hide actions */
  out: [0.4, 0, 1, 1] as const,
} as const;

// ─── Stagger presets ────────────────────────────────────────
export const stagger = {
  /** KPI cards, grid items */
  grid: 0.045,
  /** List items */
  list: 0.03,
  /** Content sections on a page */
  section: 0.08,
} as const;

// ─── Common animation variants ──────────────────────────────
export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: duration.base, ease: easing.smooth },
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: duration.fast },
    },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: duration.fast, ease: easing.smooth },
    },
  },
} as const;

// ─── Spring presets ──────────────────────────────────────────
export const spring = {
  /** Snappy pop — checkmarks, success icons */
  pop: { type: "spring" as const, stiffness: 420, damping: 22 },
} as const;

// ─── Aggregate export ────────────────────────────────────────
export const motionTokens = {
  duration,
  easing,
  stagger,
  spring,
  variants,
} as const;
