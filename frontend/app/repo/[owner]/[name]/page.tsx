import { fetchRepo } from "@/lib/api";
import ScoreCard from "@/components/ScoreCard";
import Stars from "@/components/Stars";
import { timeAgo } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function RepoPage({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}) {
  const { owner, name } = await params;
  let repo;
  try {
    repo = await fetchRepo(owner, name);
  } catch {
    repo = null;
  }
  if (!repo) notFound();

  const sc = repo.scorecard;
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← back to search
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{repo.full_name}</h1>
          <p className="mt-1 text-gray-600">{repo.description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            {repo.language && <span className="rounded bg-gray-100 px-2 py-0.5">{repo.language}</span>}
            <span className="rounded bg-gray-100 px-2 py-0.5">{repo.license}</span>
            {repo.pc_details.win_install_str && (
              <span className="rounded bg-gray-100 px-2 py-0.5">
                Win install {repo.pc_details.win_install_str}
              </span>
            )}
            <span className="rounded bg-gray-100 px-2 py-0.5">updated {timeAgo(repo.pushed_at)}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5">created {timeAgo(repo.created_at)}</span>
          </div>
        </div>
        <Stars count={repo.stars} />
      </header>

      <section className="max-w-md rounded-lg border border-gray-200 bg-white p-4">
        <ScoreCard repo={repo} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Supply-chain checks (OSSF Scorecard)</h2>
        {sc ? (
          <ul className="grid grid-cols-2 gap-1 text-sm text-gray-700 sm:grid-cols-3">
            {Object.entries(sc.checks).map(([k, v]) => (
              <li key={k} className="flex justify-between rounded bg-gray-50 px-2 py-1">
                <span className="truncate">{k}</span>
                <span className="tabular-nums text-gray-500">{v < 0 ? "—" : v}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Not indexed by OSSF Scorecard.</p>
        )}
      </section>

      <a
        href={repo.html_url}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
      >
        View on GitHub ↗
      </a>
    </div>
  );
}
