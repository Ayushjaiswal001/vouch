"use client";

import { useState } from "react";
import { fetchSearch, type SearchResponse } from "@/lib/api";
import RepoCard from "@/components/RepoCard";

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
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
      setData(await fetchSearch(q, { limit: 6 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
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
          placeholder="e.g. markdown editor, sql client, self-hosted analytics"
          aria-label="search query"
          className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-5 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Searching…" : "Vouch it"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {data && data.top.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Considered {data.considered}, vetted {data.top.length}
          {!data.auth && " · add a GitHub token to raise rate limits"}
        </p>
      )}

      {data && data.ok && data.top.length === 0 && (
        <p className="mt-4 text-sm text-gray-600">No safe matches. Try a broader category.</p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data?.top.map((repo) => (
          <RepoCard key={repo.full_name} repo={repo} />
        ))}
      </div>
    </div>
  );
}
