import type { MetadataRoute } from "next";
import { COMPARISONS } from "@/lib/comparisons";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = ["", "/vs", "/support"].map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : path === "/vs" ? 0.8 : 0.4,
  }));
  const vsRoutes: MetadataRoute.Sitemap = COMPARISONS.map((c) => ({
    url: `${SITE}/vs/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return [...staticRoutes, ...vsRoutes];
}
