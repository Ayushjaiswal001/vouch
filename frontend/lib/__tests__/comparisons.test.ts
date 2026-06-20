import { describe, it, expect } from "vitest";
import { COMPARISONS, getComparison } from "@/lib/comparisons";

describe("comparisons registry", () => {
  it("looks up by slug", () => {
    const c = getComparison("tauri-vs-electron");
    expect(c?.a).toBe("tauri-apps/tauri");
    expect(c?.b).toBe("electron/electron");
  });

  it("returns undefined for unknown slug", () => {
    expect(getComparison("nope-vs-nada")).toBeUndefined();
  });

  it("every entry is well-formed (slug pattern, two owner/name repos)", () => {
    for (const c of COMPARISONS) {
      expect(c.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-vs-[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(c.a).toMatch(/^[^/]+\/[^/]+$/);
      expect(c.b).toMatch(/^[^/]+\/[^/]+$/);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.blurb.length).toBeGreaterThan(0);
    }
  });

  it("slugs are unique", () => {
    const slugs = COMPARISONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
