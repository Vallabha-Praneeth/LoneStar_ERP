import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCurrencyDetail,
  formatHours,
  formatPercent,
  formatNumber,
  formatRouteName,
  csvSafe,
} from "../../src/lib/analytics/formatters";

describe("formatCurrency", () => {
  it("formats whole dollars", () => {
    expect(formatCurrency(12500)).toBe("$12,500");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats negative", () => {
    expect(formatCurrency(-3000)).toBe("-$3,000");
  });
});

describe("formatCurrencyDetail", () => {
  it("includes two decimals", () => {
    expect(formatCurrencyDetail(12500)).toBe("$12,500.00");
  });

  it("formats cents", () => {
    expect(formatCurrencyDetail(99.5)).toBe("$99.50");
  });
});

describe("formatHours", () => {
  it("formats with one decimal and label", () => {
    expect(formatHours(42.567)).toBe("42.6 hrs");
  });

  it("formats zero", () => {
    expect(formatHours(0)).toBe("0.0 hrs");
  });
});

describe("formatPercent", () => {
  it("formats fraction as percentage", () => {
    expect(formatPercent(0.5833)).toBe("58.3%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("formats negative margin", () => {
    expect(formatPercent(-0.25)).toBe("-25.0%");
  });
});

describe("formatNumber", () => {
  it("adds commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("formatRouteName", () => {
  it("returns route name when present", () => {
    expect(formatRouteName("Devon Ave Loop")).toBe("Devon Ave Loop");
  });

  it("returns fallback for null", () => {
    expect(formatRouteName(null)).toBe("No Route");
  });

  it("returns fallback for undefined", () => {
    expect(formatRouteName(undefined)).toBe("No Route");
  });

  it("returns fallback for empty string", () => {
    expect(formatRouteName("")).toBe("No Route");
  });
});

describe("csvSafe", () => {
  it("returns plain strings unchanged", () => {
    expect(csvSafe("hello")).toBe("hello");
  });

  it("wraps strings with commas", () => {
    expect(csvSafe("hello, world")).toBe('"hello, world"');
  });

  it("escapes double quotes", () => {
    expect(csvSafe('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps strings with newlines", () => {
    expect(csvSafe("line1\nline2")).toBe('"line1\nline2"');
  });
});
