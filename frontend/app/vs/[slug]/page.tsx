import { fetchRepo } from "@/lib/api";
import { COMPARISONS, getComparison } from "@/lib/comparisons";
import VsComparison from "@/components/VsComparison";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ISR: generate on demand, cache, refresh daily. Empty static params keeps the
// production build independent of the backend.
export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return { title: "Comparison not found | VOUCH" };
  const title = `${c.title}: which to choose? — ${c.category} compared | VOUCH`;
  const description = `${c.title} compared side by side on safety, maintenance, popularity, and footprint. ${c.blurb}`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/vs/${c.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE}/vs/${c.slug}`,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function VsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const [aOwner, aName] = c.a.split("/");
  const [bOwner, bName] = c.b.split("/");
  const [a, b] = await Promise.all([
    fetchRepo(aOwner, aName, { revalidate: 86400 }).catch(() => null),
    fetchRepo(bOwner, bName, { revalidate: 86400 }).catch(() => null),
  ]);
  if (!a || !b) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: c.title,
    description: c.blurb,
    itemListElement: [a, b].map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SoftwareApplication",
        name: r.full_name,
        applicationCategory: "DeveloperApplication",
        url: r.html_url,
        description: r.description,
      },
    })),
  };

  const related = COMPARISONS.filter((x) => x.slug !== c.slug).slice(0, 4);

  return (
    <article className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-blue-600">
        <Link href="/vs" className="hover:underline">
          ← all comparisons
        </Link>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
        <p className="mt-2 max-w-2xl text-gray-600">{c.blurb}</p>
      </header>

      <VsComparison a={a} b={b} />

      <section className="max-w-3xl text-sm leading-relaxed text-gray-700">
        <h2 className="mb-2 text-base font-semibold text-gray-900">
          {c.title}: which should you choose?
        </h2>
        <p>{c.intro}</p>
        <p className="mt-2 text-gray-500">
          Scores above are computed live from {a.full_name} and {b.full_name} using
          OSSF Scorecard, GitHub activity, popularity, and footprint signals.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Related comparisons</h2>
        <ul className="flex flex-wrap gap-2">
          {related.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/vs/${r.slug}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:border-gray-400"
              >
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
