import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SplashScreen from "@/components/SplashScreen";
import SupportButton from "@/components/SupportButton";

export const metadata: Metadata = {
  title: "VOUCH — Vetted open-source tools",
  description:
    "Discover, compare, and trust-check open-source tools with transparent safety and health scores.",
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
