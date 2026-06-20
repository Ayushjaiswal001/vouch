import { COMPARISONS } from "@/lib/comparisons";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open-source comparisons — trust, safety & health | VOUCH",
  description:
    "Side-by-side comparisons of popular open-source tools, scored on safety, maintenance, popularity, and footprint.",
};

export default function VsIndex() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Comparisons</h1>
        <p className="mt-2 text-gray-600">
          Popular open-source tools compared on VOUCH&apos;s trust signals.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {COMPARISONS.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/vs/${c.slug}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400"
            >
              <span className="font-semibold">{c.title}</span>
              <span className="mt-0.5 block text-xs uppercase tracking-wide text-gray-400">
                {c.category}
              </span>
              <span className="mt-1 block line-clamp-2 text-sm text-gray-600">{c.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
