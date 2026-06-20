import { formatStars } from "@/lib/format";

export default function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
      <span aria-hidden>★</span>
      <span className="tabular-nums">{formatStars(count)}</span>
    </span>
  );
}
