export interface Scores {
  total: number;
  safety: number;
  popularity: number;
  maintenance: number;
  pc_fit: number;
}

export interface Scorecard {
  score: number | null;
  checks: Record<string, number>;
}

export interface PcDetails {
  stack: string | null;
  win_install_bytes: number | null;
  win_install_str: string | null;
}

export interface RepoResult {
  full_name: string;
  html_url: string;
  description: string;
  stars: number;
  license: string;
  pushed_at: string | null;
  created_at: string | null;
  language: string;
  topics: string[];
  scorecard: Scorecard | null;
  advisories_count: number;
  has_high_advisory: boolean;
  has_critical_advisory: boolean;
  pc_details: PcDetails;
  scores: Scores;
}

export interface DroppedRepo {
  full_name: string;
  html_url: string;
  reason: string;
}

export interface SearchResponse {
  ok: boolean;
  error?: string | null;
  error_kind?: string | null;
  query: string;
  considered: number;
  dropped: DroppedRepo[];
  top: RepoResult[];
  auth: boolean;
}

export interface Pick {
  full_name: string;
  recommendation: string;
  pros: string[];
  cons: string[];
}

export interface RecommendResponse {
  ok: boolean;
  mode: "ai" | "fallback";
  query: string;
  summary: string;
  picks: Pick[];
  repos: RepoResult[];
  auth: boolean;
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

export async function fetchSearch(
  query: string,
  opts: { limit?: number; relaxed?: boolean } = {},
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.relaxed) params.set("relaxed", "true");
  const res = await fetch(`${API_BASE}/api/search?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Search failed (${res.status})`);
  }
  return (await res.json()) as SearchResponse;
}

export async function fetchRepo(
  owner: string,
  name: string,
  opts: { revalidate?: number } = {},
): Promise<RepoResult | null> {
  // When a revalidate window is given, use ISR-friendly caching so callers that
  // declare `export const revalidate` (e.g. /vs/[slug]) stay statically
  // generatable; otherwise fetch fresh (no-store) for live search/detail.
  const init: RequestInit =
    opts.revalidate !== undefined
      ? { next: { revalidate: opts.revalidate } }
      : { cache: "no-store" };
  const res = await fetch(`${API_BASE}/api/repo/${owner}/${name}`, init);
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Repo fetch failed (${res.status})`);
  }
  return (await res.json()) as RepoResult;
}

export async function fetchRecommend(
  query: string,
  limit = 5,
): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Recommend failed (${res.status})`);
  }
  return (await res.json()) as RecommendResponse;
}
