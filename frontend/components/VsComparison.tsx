import type { RepoResult } from "@/lib/api";
import { formatStars } from "@/lib/format";
import Link from "next/link";

type Metric = { label: string; get: (r: RepoResult) => number; pct: boolean };

const METRICS: Metric[] = [
  { label: "Trust score", get: (r) => r.scores.total, pct: true },
  { label: "Safety", get: (r) => r.scores.safety, pct: true },
  { label: "Popularity", get: (r) => r.scores.popularity, pct: true },
  { label: "Maintenance", get: (r) => r.scores.maintenance, pct: true },
  { label: "Lightweight", get: (r) => r.scores.pc_fit, pct: true },
];

function detailHref(fullName: string): string {
  const [owner, name] = fullName.split("/");
  return `/repo/${owner}/${name}`;
}

export default function VsComparison({ a, b }: { a: RepoResult; b: RepoResult }) {
  const winner =
    a.scores.total === b.scores.total
      ? null
      : a.scores.total > b.scores.total
        ? a
        : b;

  function cell(r: RepoResult, m: Metric) {
    const other = r === a ? b : a;
    const isHigher = m.get(r) > m.get(other);
    const val = m.pct ? Math.round(m.get(r) * 100) : m.get(r);
    return (
      <td
        className={`p-3 tabular-nums ${isHigher ? "font-bold text-green-700" : "text-gray-700"}`}
        data-higher={isHigher ? "true" : "false"}
      >
        {val}
        {isHigher && <span aria-hidden> ✓</span>}
      </td>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 text-left font-medium text-gray-500">Metric</th>
              {[a, b].map((r) => (
                <th key={r.full_name} className="p-3 text-left">
                  <Link href={detailHref(r.full_name)} className="font-semibold hover:underline">
                    {r.full_name}
                  </Link>
                  <div className="text-xs font-normal text-gray-500">
                    ★ {formatStars(r.stars)} · {r.license} · {r.language || "—"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => (
              <tr key={m.label} className="border-b border-gray-100 last:border-0">
                <td className="p-3 text-gray-500">{m.label}</td>
                {cell(a, m)}
                {cell(b, m)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="rounded-md bg-gray-900 px-4 py-3 text-sm text-white">
        {winner
          ? `By VOUCH's overall trust score, ${winner.full_name} edges ahead (${Math.round(
              winner.scores.total * 100,
            )}/100). Both are viable — pick based on the factors that matter to you.`
          : `${a.full_name} and ${b.full_name} score identically overall — choose on the factor that matters most to you.`}
      </p>
    </div>
  );
}
