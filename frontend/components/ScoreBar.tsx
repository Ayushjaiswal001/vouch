interface ScoreBarProps {
  label: string;
  value: number; // 0..1
}

export default function ScoreBar({ label, value }: ScoreBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const hue = Math.round(pct * 1.2); // 0=red -> 120=green
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 shrink-0 text-gray-600">{label}</span>
      <div className="h-2 flex-1 rounded bg-gray-200">
        <div
          role="meter"
          aria-label={label}
          aria-valuenow={pct}
          className="h-2 rounded"
          style={{ width: `${pct}%`, backgroundColor: `hsl(${hue} 70% 45%)` }}
        />
      </div>
      <span className="w-10 text-right tabular-nums text-gray-700">{pct}</span>
    </div>
  );
}
