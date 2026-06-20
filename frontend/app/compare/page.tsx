import { fetchRepo, type RepoResult } from "@/lib/api";
import Link from "next/link";

function parseRepos(param: string | string[] | undefined): string[] {
  const raw = Array.isArray(param) ? param.join(",") : (param ?? "");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[^/]+\/[^/]+$/.test(s))
    .slice(0, 4);
}

const ROWS: { label: string; get: (r: RepoResult) => string }[] = [
  { label: "Trust score", get: (r) => String(Math.round(r.scores.total * 100)) },
  { label: "Safety", get: (r) => String(Math.round(r.scores.safety * 100)) },
  { label: "Popularity", get: (r) => String(Math.round(r.scores.popularity * 100)) },
  { label: "Maintenance", get: (r) => String(Math.round(r.scores.maintenance * 100)) },
  { label: "Lightweight", get: (r) => String(Math.round(r.scores.pc_fit * 100)) },
  { label: "Stars", get: (r) => String(r.stars) },
  { label: "License", get: (r) => r.license },
  { label: "Language", get: (r) => r.language || "—" },
  { label: "Win install", get: (r) => r.pc_details.win_install_str || "—" },
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ repos?: string | string[] }>;
}) {
  const { repos: reposParam } = await searchParams;
  const names = parseRepos(reposParam);
  const fetched = await Promise.all(
    names.map(async (full) => {
      const [owner, name] = full.split("/");
      try {
        return await fetchRepo(owner, name);
      } catch {
        return null;
      }
    }),
  );
  const repos = fetched.filter((r): r is RepoResult => r !== null);

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← back to search
      </Link>
      <h1 className="text-2xl font-bold">Compare</h1>

      {repos.length === 0 ? (
        <p className="text-gray-600">
          Add repos to compare via the URL, e.g.{" "}
          <code className="rounded bg-gray-100 px-1">/compare?repos=KDE/ghostwriter,0x7c13/Notepads</code>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-3 text-left font-medium text-gray-500">Metric</th>
                {repos.map((r) => (
                  <th key={r.full_name} className="p-3 text-left font-semibold">
                    {r.full_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-gray-100 last:border-0">
                  <td className="p-3 text-gray-500">{row.label}</td>
                  {repos.map((r) => (
                    <td key={r.full_name} className="p-3 tabular-nums">
                      {row.get(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
