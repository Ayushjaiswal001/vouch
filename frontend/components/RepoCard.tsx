import type { RepoResult } from "@/lib/api";
import Link from "next/link";
import Stars from "@/components/Stars";
import ScoreCard from "@/components/ScoreCard";
import { timeAgo } from "@/lib/format";

export default function RepoCard({ repo }: { repo: RepoResult }) {
  const [owner, name] = repo.full_name.split("/");
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/repo/${owner}/${name}`}
            className="truncate text-lg font-semibold text-gray-900 hover:underline"
          >
            {repo.full_name}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{repo.description}</p>
        </div>
        <Stars count={repo.stars} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
        {repo.language && <span className="rounded bg-gray-100 px-2 py-0.5">{repo.language}</span>}
        <span className="rounded bg-gray-100 px-2 py-0.5">{repo.license}</span>
        {repo.pc_details.win_install_str && (
          <span className="rounded bg-gray-100 px-2 py-0.5">{repo.pc_details.win_install_str}</span>
        )}
        <span className="rounded bg-gray-100 px-2 py-0.5">updated {timeAgo(repo.pushed_at)}</span>
      </div>
      <div className="mt-3">
        <ScoreCard repo={repo} />
      </div>
      <div className="mt-3 flex gap-3 text-sm">
        <a href={repo.html_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          GitHub ↗
        </a>
        <Link href={`/repo/${owner}/${name}`} className="text-blue-600 hover:underline">
          Details
        </Link>
      </div>
    </article>
  );
}
