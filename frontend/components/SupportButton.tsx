"use client";

import { useState } from "react";

// Floating "Support" pill (lower-right). Links to NEXT_PUBLIC_SUPPORT_URL
// (a Razorpay payment link) when set, otherwise to the internal /support page.
// Framed as "Support" rather than "Donation" for Indian-law compliance — see
// /support for the legal rationale (FCRA / 80G / RBI PA guidelines).
export default function SupportButton() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const url = process.env.NEXT_PUBLIC_SUPPORT_URL || "/support";
  const external = url.startsWith("http");

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1 shadow-lg backdrop-blur">
      <a
        href={url}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="rounded-full bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        ☕ Support VOUCH
      </a>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Dismiss support button"
        className="px-1.5 text-lg leading-none text-gray-400 hover:text-gray-700"
      >
        ×
      </button>
    </div>
  );
}
