import { describe, it, expect } from "vitest";
import {
  workedHours,
  grossProfit,
  marginPct,
  avgPayoutPerHour,
  avgRevenuePerCampaign,
  num,
} from "../../src/lib/analytics/calculations";

describe("workedHours", () => {
  it("computes hours between two timestamps", () => {
    const start = "2026-04-01T08:00:00Z";
    const end = "2026-04-01T16:30:00Z";
    expect(workedHours(start, end)).toBeCloseTo(8.5, 5);
  });

  it("returns 0 for null start", () => {
    expect(workedHours(null, "2026-04-01T16:00:00Z")).toBe(0);
  });

  it("returns 0 for null end", () => {
    expect(workedHours("2026-04-01T08:00:00Z", null)).toBe(0);
  });

  it("returns 0 for both null", () => {
    expect(workedHours(null, null)).toBe(0);
  });

  it("returns 0 when end is before start", () => {
    expect(workedHours("2026-04-01T16:00:00Z", "2026-04-01T08:00:00Z")).toBe(0);
  });

  it("returns 0 when start equals end", () => {
    expect(workedHours("2026-04-01T08:00:00Z", "2026-04-01T08:00:00Z")).toBe(0);
  });
});

describe("grossProfit", () => {
  it("computes revenue minus all costs", () => {
    expect(grossProfit(10000, 3000, 2000)).toBe(5000);
  });

  it("returns negative for loss", () => {
    expect(grossProfit(1000, 3000, 2000)).toBe(-4000);
  });

  it("handles zero revenue", () => {
    expect(grossProfit(0, 500, 200)).toBe(-700);
  });
});

describe("marginPct", () => {
  it("computes margin as fraction of revenue", () => {
    expect(marginPct(10000, 5000)).toBeCloseTo(0.5, 5);
  });

  it("returns 0 for zero revenue", () => {
    expect(marginPct(0, 0)).toBe(0);
  });

  it("returns 0 for negative revenue", () => {
    expect(marginPct(-100, 50)).toBe(0);
  });

  it("handles negative profit with positive revenue", () => {
    expect(marginPct(1000, -500)).toBeCloseTo(-0.5, 5);
  });
});

describe("avgPayoutPerHour", () => {
  it("computes average rate", () => {
    expect(avgPayoutPerHour(1600, 8)).toBeCloseTo(200, 5);
  });

  it("returns 0 for zero hours", () => {
    expect(avgPayoutPerHour(1600, 0)).toBe(0);
  });

  it("returns 0 for negative hours", () => {
    expect(avgPayoutPerHour(1600, -1)).toBe(0);
  });
});

describe("avgRevenuePerCampaign", () => {
  it("computes average", () => {
    expect(avgRevenuePerCampaign(30000, 3)).toBeCloseTo(10000, 5);
  });

  it("returns 0 for zero campaigns", () => {
    expect(avgRevenuePerCampaign(30000, 0)).toBe(0);
  });
});

describe("num", () => {
  it("passes through a number", () => {
    expect(num(42)).toBe(42);
  });

  it("returns 0 for null", () => {
    expect(num(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(num(undefined)).toBe(0);
  });
});
