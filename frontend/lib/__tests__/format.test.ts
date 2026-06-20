import { describe, it, expect } from "vitest";
import { formatStars, timeAgo } from "@/lib/format";

describe("formatStars", () => {
  it("formats thousands", () => {
    expect(formatStars(4904)).toBe("4.9k");
    expect(formatStars(10136)).toBe("10k");
    expect(formatStars(500)).toBe("500");
  });
});

describe("timeAgo", () => {
  it("handles missing", () => {
    expect(timeAgo(null)).toBe("unknown");
    expect(timeAgo("not-a-date")).toBe("unknown");
  });
});
