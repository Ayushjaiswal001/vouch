import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SplashScreen from "@/components/SplashScreen";
import SupportButton from "@/components/SupportButton";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vouch-mauve-two.vercel.app";
// Feedback link: set NEXT_PUBLIC_FEEDBACK_URL to a Tally form when ready;
// falls back to email so it works immediately.
const FEEDBACK =
  process.env.NEXT_PUBLIC_FEEDBACK_URL ??
  "mailto:ayushjaiswal1204@gmail.com?subject=VOUCH%20feedback";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "VOUCH — Find open-source tools you can trust",
  description:
    "Discover, compare, and trust-check open-source tools in seconds. VOUCH scores every project on safety, maintenance, popularity, and footprint, with AI-powered recommendations.",
  applicationName: "VOUCH",
  keywords: [
    "open source",
    "open-source tools",
    "github",
    "OSS comparison",
    "dependency safety",
    "OSSF Scorecard",
    "developer tools",
  ],
  openGraph: {
    type: "website",
    siteName: "VOUCH",
    url: SITE,
    title: "VOUCH — Find open-source tools you can trust",
    description:
      "Discover, compare, and trust-check open-source tools with transparent safety, maintenance, popularity, and footprint scores — plus AI compare & recommend.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VOUCH — Find open-source tools you can trust",
    description:
      "Transparent trust scores + AI recommendations for open-source tools.",
  },
  verification: {
    other: {
      "msvalidate.01": "8A15066D82C989C9DD46E2BD0180A719",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <SplashScreen />
        <header className="border-b border-gray-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Image
                src="/logo.png"
                alt="VOUCH Logo"
                width={28}
                height={28}
                className="object-contain"
              />
              <span>VOUCH</span>
            </Link>
            <span className="text-xs text-gray-500">Vetted Open-source Utilities &amp; Comparison Hub</span>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <SupportButton />
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-gray-500">
          <p>
            <Link href="/support" className="underline hover:text-gray-700">
              Support
            </Link>{" "}
            ·{" "}
            <Link href="/support#refunds" className="underline hover:text-gray-700">
              Policies
            </Link>{" "}
            ·{" "}
            <a
              href={FEEDBACK}
              {...(FEEDBACK.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              className="underline hover:text-gray-700"
            >
              Feedback
            </a>{" "}
            · Data from{" "}
            <a href="https://docs.github.com/rest" target="_blank" rel="noreferrer" className="underline hover:text-gray-700">
              GitHub
            </a>{" "}
            &amp; the{" "}
            <a href="https://securityscorecards.dev" target="_blank" rel="noreferrer" className="underline hover:text-gray-700">
              OSSF Scorecard
            </a>
            . Scores are heuristic signals, provided as-is with no warranty — verify before adopting. VOUCH collects no personal data.
          </p>
          <p className="mt-1">© {new Date().getFullYear()} VOUCH · A free open-source discovery tool.</p>
        </footer>
      </body>
    </html>
  );
}
