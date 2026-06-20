import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSearch, fetchRepo, fetchRecommend } from "@/lib/api";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchSearch", () => {
  it("builds the query and returns parsed body", async () => {
    const body = { ok: true, query: "x", considered: 1, dropped: [], top: [], auth: false };
    const f = mockFetch(200, body);
    vi.stubGlobal("fetch", f);
    const out = await fetchSearch("markdown editor", { limit: 3 });
    expect(out.ok).toBe(true);
    const url = f.mock.calls[0][0] as string;
    expect(url).toContain("/api/search?");
    expect(url).toContain("q=markdown+editor");
    expect(url).toContain("limit=3");
  });

  it("throws on non-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(429, { detail: "rate limited" }));
    await expect(fetchSearch("x")).rejects.toThrow("rate limited");
  });
});

describe("fetchRepo", () => {
  it("returns null on 404", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { detail: "nope" }));
    expect(await fetchRepo("no", "such")).toBeNull();
  });
});

describe("fetchRecommend", () => {
  it("POSTs the query and parses the body", async () => {
    const body = { ok: true, mode: "fallback", query: "x", summary: "s", picks: [], repos: [], auth: false };
    const f = mockFetch(200, body);
    vi.stubGlobal("fetch", f);
    const out = await fetchRecommend("sql client", 5);
    expect(out.mode).toBe("fallback");
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/recommend");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ query: "sql client", limit: 5 });
  });

  it("throws on non-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(502, { detail: "bad gateway" }));
    await expect(fetchRecommend("x")).rejects.toThrow("bad gateway");
  });
});
