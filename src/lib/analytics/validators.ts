import { z } from "zod";
import { VALID_RANGES, VALID_STATUSES, VALID_GRANULARITIES } from "./constants";

/** Schema for raw analytics query params before normalization. */
export const analyticsParamsSchema = z.object({
  range: z.enum(VALID_RANGES as [string, ...string[]]).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  clientId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  status: z.enum(VALID_STATUSES as [string, ...string[]]).optional(),
  granularity: z.enum(VALID_GRANULARITIES as [string, ...string[]]).optional(),
});

export type RawAnalyticsParams = z.infer<typeof analyticsParamsSchema>;

/** Validate raw params. Returns { success, data, error }. */
export function validateParams(raw: Record<string, unknown>) {
  return analyticsParamsSchema.safeParse(raw);
}
