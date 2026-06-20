"use client";

import { useState } from "react";
import { fetchRecommend, type RecommendResponse } from "@/lib/api";
import RepoCard from "@/components/RepoCard";

export default function AIRecommend() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      setData(await fetchRecommend(q, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recommend failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={run} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what you need: 'self-hosted analytics that isn't bloated'"
          aria-label="ask ai query"
          className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Ask AI"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {data && (
        <section className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                data.mode === "ai" ? "bg-indigo-600 text-white" : "bg-gray-300 text-gray-700"
              }`}
            >
              {data.mode === "ai" ? "AI recommendation" : "Heuristic ranking"}
            </span>
            {data.mode === "fallback" && (
              <span className="text-xs text-gray-500">add a free LLM key for AI prose</span>
            )}
          </div>
          <p className="text-sm text-gray-800">{data.summary}</p>

          <ol className="mt-3 space-y-3">
            {data.picks.map((p, i) => (
              <li key={p.full_name} className="rounded-md border border-gray-200 bg-white p-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-500">#{i + 1}</span>
                  <span className="font-semibold">{p.full_name}</span>
                </div>
                {p.recommendation && (
                  <p className="mt-1 text-sm text-gray-700">{p.recommendation}</p>
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <ul className="space-y-0.5 text-sm text-green-700">
                    {p.pros.map((x, j) => (
                      <li key={j}>+ {x}</li>
                    ))}
                  </ul>
                  <ul className="space-y-0.5 text-sm text-amber-700">
                    {p.cons.map((x, j) => (
                      <li key={j}>− {x}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data?.repos.map((repo) => (
          <RepoCard key={repo.full_name} repo={repo} />
        ))}
      </div>
    </div>
  );
}
