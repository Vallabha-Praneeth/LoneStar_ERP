import { motionTokens } from "@/lib/tokens/motion-tokens";

/** Staggered list rows (campaign cards, routes, users, cost types). */
export const listStaggerParent = {
  hidden: {},
  visible: {
    transition: { staggerChildren: motionTokens.stagger.list },
  },
} as const;

/** Staggered grid cells (KPIs, photo tiles, stat cards). */
export const gridStaggerParent = {
  hidden: {},
  visible: {
    transition: { staggerChildren: motionTokens.stagger.grid },
  },
} as const;

/** Staggered page sections (campaign detail blocks). */
export const sectionStaggerParent = {
  hidden: {},
  visible: {
    transition: { staggerChildren: motionTokens.stagger.section },
  },
} as const;

export const fadeUp = motionTokens.variants.fadeUp;
export const fadeIn = motionTokens.variants.fadeIn;
export const scaleIn = motionTokens.variants.scaleIn;
