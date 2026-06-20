import type { RepoResult } from "@/lib/api";
import ScoreBar from "@/components/ScoreBar";

export default function ScoreCard({ repo }: { repo: RepoResult }) {
  const s = repo.scores;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Trust score</span>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm font-semibold text-white tabular-nums">
          {Math.round(s.total * 100)}
        </span>
      </div>
      <ScoreBar label="Safety" value={s.safety} />
      <ScoreBar label="Popularity" value={s.popularity} />
      <ScoreBar label="Maintenance" value={s.maintenance} />
      <ScoreBar label="Lightweight" value={s.pc_fit} />
      {repo.has_critical_advisory && (
        <p className="text-xs font-medium text-red-600">Open CRITICAL advisory</p>
      )}
      {!repo.has_critical_advisory && repo.has_high_advisory && (
        <p className="text-xs font-medium text-amber-600">Open high-severity advisory</p>
      )}
    </div>
  );
}
