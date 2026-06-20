import HomeTabs from "@/app/search/HomeTabs";
import Link from "next/link";
import { COMPARISONS } from "@/lib/comparisons";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Find open-source tools you can trust
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-gray-600">
          VOUCH ranks open-source projects by safety, maintenance, popularity, and
          how lightweight they are — search directly, or ask the AI to recommend and
          compare for your exact need.
        </p>
      </section>
      <HomeTabs />
      <section className="border-t border-gray-200 pt-6">
        <h2 className="text-sm font-semibold text-gray-700">Popular comparisons</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {COMPARISONS.slice(0, 6).map((c) => (
            <li key={c.slug}>
              <Link
                href={`/vs/${c.slug}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:border-gray-400"
              >
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/vs" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Browse all comparisons →
        </Link>
      </section>
    </div>
  );
}
