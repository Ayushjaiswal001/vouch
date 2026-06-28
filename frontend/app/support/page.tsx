import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support VOUCH",
  description:
    "VOUCH is free to use. If it helped you, you can support its development.",
};

const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL;
const CONTACT_EMAIL = "ayushjaiswal1204@gmail.com";

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Support VOUCH</h1>
        <p className="mt-2 text-gray-600">
          VOUCH is free and collects no personal data. If it saved you time, a
          small voluntary contribution helps cover hosting and keeps it free for
          everyone. This is a gift to support an independent developer — not a
          charitable donation, and no goods or services are exchanged.
        </p>
      </header>

      <section>
        {SUPPORT_URL ? (
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
          >
            ☕ Support via Razorpay
          </a>
        ) : (
          <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Support link is being set up. Please check back shortly.
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Payments are processed securely by Razorpay (an RBI-authorised payment
          aggregator). VOUCH never sees or stores your card or UPI details.
        </p>
      </section>

      <hr className="border-gray-200" />

      {/* Policies below are published as required by RBI Payment Aggregator
          guidelines and Razorpay onboarding. */}
      <section id="terms" className="space-y-2 text-sm text-gray-700">
        <h2 className="text-base font-semibold text-gray-900">Terms &amp; Conditions</h2>
        <p>
          VOUCH is provided free of charge, &ldquo;as is&rdquo;, with no warranty.
          Trust scores are heuristic signals derived from public data (GitHub and
          the OSSF Scorecard) and may be inaccurate or out of date; verify before
          relying on them. Contributions made via the Support option are voluntary
          and grant no product, license, or service in return. By contributing you
          confirm the payment is lawful and made from your own funds.
        </p>
      </section>

      <section id="privacy" className="space-y-2 text-sm text-gray-700">
        <h2 className="text-base font-semibold text-gray-900">Privacy Policy</h2>
        <p>
          VOUCH does not require accounts and collects no personal data. Search
          queries are sent to our backend only to fetch public repository data and
          are not stored against your identity. Payment processing is handled
          entirely by Razorpay under its own privacy policy; VOUCH does not receive
          your payment-instrument details.
        </p>
      </section>

      <section id="refunds" className="space-y-2 text-sm text-gray-700">
        <h2 className="text-base font-semibold text-gray-900">
          Refund &amp; Cancellation Policy
        </h2>
        <p>
          Voluntary contributions are non-refundable, as no goods or services are
          provided in exchange. If a payment was made in genuine error, email{" "}
          <a className="text-blue-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          within 7 days and we will review a refund in good faith.
        </p>
      </section>

      <section id="contact" className="space-y-2 text-sm text-gray-700">
        <h2 className="text-base font-semibold text-gray-900">Contact</h2>
        <p>
          Operated by an independent developer based in Bengaluru, India. For any
          query, reach{" "}
          <a className="text-blue-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <p className="text-xs text-gray-400">
        Not legal or tax advice. <Link href="/" className="underline">Back to VOUCH</Link>
      </p>
    </div>
  );
}
