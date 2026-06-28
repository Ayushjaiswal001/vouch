import HomeTabs from "@/app/search/HomeTabs";
import Link from "next/link";
import type { Metadata } from "next";
import { COMPARISONS } from "@/lib/comparisons";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vouch-mauve-two.vercel.app";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "VOUCH",
      url: SITE,
      description:
        "Discover, compare, and trust-check open-source tools with transparent safety, maintenance, popularity, and footprint scores.",
    },
    {
      "@type": "SoftwareApplication",
      name: "VOUCH",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: SITE,
      description:
        "VOUCH ranks open-source GitHub projects on safety (OSSF Scorecard + advisories), maintenance, popularity, and footprint, with AI-powered recommendations and side-by-side comparisons.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export default function Home() {
  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
