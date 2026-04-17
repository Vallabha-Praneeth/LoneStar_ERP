/**
 * Central Rive animation asset registry for web.
 * Mirror of mobile's `src/components/motion/rive-assets.ts`.
 * Keep all .riv imports here — one place to update paths.
 */
import unlockSrc from "@/assets/rive/unlock.riv";

export const riveAssets = {
  // Controls
  unlock: unlockSrc,
} as const;

export type RiveAssetKey = keyof typeof riveAssets;
