import { describe, it, expect } from "vitest";
import { parseFilters, resolveDateBounds, resolveGranularity, filtersToSearchParams } from "../../src/lib/analytics/filters";

const NOW = new Date("2026-04-03T12:00:00Z");

describe("parseFilters", () => {
  it("defaults to 3m range with week granularity", () => {
    const filters = parseFilters(new URLSearchParams(), NOW);
    expect(filters.range).toBe("3m");
    expect(filters.granularity).toBe("week");
    expect(filters.from).toBe("2026-01-03");
    expect(filters.to).toBe("2026-04-03");
  });

  it("parses all params from URLSearchParams", () => {
    const params = new URLSearchParams({
      range: "1m",
      clientId: "00000000-0000-0000-0000-000000000001",
      driverId: "00000000-0000-0000-0000-000000000002",
      status: "completed",
    });
    const filters = parseFilters(params, NOW);
    expect(filters.range).toBe("1m");
    expect(filters.granularity).toBe("day");
    expect(filters.clientId).toBe("00000000-0000-0000-0000-000000000001");
    expect(filters.driverId).toBe("00000000-0000-0000-0000-000000000002");
    expect(filters.status).toBe("completed");
  });

  it("rejects invalid range and falls back to default", () => {
    const filters = parseFilters(new URLSearchParams({ range: "99y" }), NOW);
    expect(filters.range).toBe("3m");
  });

  it("rejects invalid status and returns undefined", () => {
    const filters = parseFilters(new URLSearchParams({ status: "archived" }), NOW);
    expect(filters.status).toBeUndefined();
  });

  it("parses from plain object", () => {
    const filters = parseFilters({ range: "6m", status: "active" }, NOW);
    expect(filters.range).toBe("6m");
    expect(filters.granularity).toBe("week");
    expect(filters.status).toBe("active");
  });
});

describe("resolveDateBounds", () => {
  it("computes 1m bounds", () => {
    const { from, to } = resolveDateBounds("1m", undefined, undefined, NOW);
    expect(from).toBe("2026-03-03");
    expect(to).toBe("2026-04-03");
  });

  it("computes 1y bounds", () => {
    const { from, to } = resolveDateBounds("1y", undefined, undefined, NOW);
    expect(from).toBe("2025-04-03");
    expect(to).toBe("2026-04-03");
  });

  it("uses custom from/to when range is custom", () => {
    const { from, to } = resolveDateBounds("custom", "2026-01-01", "2026-02-28", NOW);
    expect(from).toBe("2026-01-01");
    expect(to).toBe("2026-02-28");
  });

  it("falls back for invalid custom dates", () => {
    const { from, to } = resolveDateBounds("custom", "not-a-date", undefined, NOW);
    expect(from).toBe("2026-01-03"); // fallback 3m
    expect(to).toBe("2026-04-03");
  });
});

describe("resolveGranularity", () => {
  it("returns explicit granularity when valid", () => {
    expect(resolveGranularity("3m", "month", "2026-01-03", "2026-04-03")).toBe("month");
  });

  it("uses range default when no explicit granularity", () => {
    expect(resolveGranularity("1m", undefined, "2026-03-03", "2026-04-03")).toBe("day");
    expect(resolveGranularity("9m", undefined, "2025-07-03", "2026-04-03")).toBe("month");
  });

  it("infers for custom range: short span = day", () => {
    expect(resolveGranularity("custom", undefined, "2026-03-01", "2026-04-01")).toBe("day");
  });

  it("infers for custom range: medium span = week", () => {
    expect(resolveGranularity("custom", undefined, "2025-10-01", "2026-04-01")).toBe("week");
  });

  it("infers for custom range: long span = month", () => {
    expect(resolveGranularity("custom", undefined, "2025-01-01", "2026-04-01")).toBe("month");
  });
});

describe("filtersToSearchParams", () => {
  it("serializes preset range without from/to", () => {
    const params = filtersToSearchParams({
      range: "3m",
      from: "2026-01-03",
      to: "2026-04-03",
      granularity: "week",
    });
    expect(params.get("range")).toBe("3m");
    expect(params.has("from")).toBe(false);
    expect(params.has("to")).toBe(false);
  });

  it("includes from/to for custom range", () => {
    const params = filtersToSearchParams({
      range: "custom",
      from: "2026-01-01",
      to: "2026-02-28",
      granularity: "day",
      clientId: "abc-123",
    });
    expect(params.get("range")).toBe("custom");
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-02-28");
    expect(params.get("clientId")).toBe("abc-123");
  });

  it("omits undefined optional filters", () => {
    const params = filtersToSearchParams({
      range: "1m",
      from: "2026-03-03",
      to: "2026-04-03",
      granularity: "day",
    });
    expect(params.has("clientId")).toBe(false);
    expect(params.has("status")).toBe(false);
  });
});
