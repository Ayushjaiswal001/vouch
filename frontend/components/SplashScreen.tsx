"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Check if splash has already been shown in this session
    const hasSeenSplash = sessionStorage.getItem("vouch_seen_splash");
    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }

    setMounted(true);

    // Initial delay for the entry animation of the logo
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1500);

    // Completely unmount the splash screen after fade transition finishes
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem("vouch_seen_splash", "true");
    }, 2200); // 1500ms delay + 700ms transition time

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!showSplash) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-700 ease-in-out ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative flex flex-col items-center text-center px-4">
        {/* Glow effect background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Vouch Logo */}
        <div
          className={`relative transition-all duration-1000 ease-out transform ${
            mounted ? "scale-100 opacity-100 translate-y-0" : "scale-75 opacity-0 translate-y-8"
          }`}
        >
          <Image
            src="/logo.png"
            alt="VOUCH Logo"
            width={160}
            height={160}
            priority
            className="object-contain"
          />
        </div>

        {/* Title & Tagline with delay fade-in */}
        <div
          className={`mt-6 transition-all duration-1000 delay-300 ease-out transform ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h1 className="text-3xl font-extrabold tracking-widest text-white uppercase drop-shadow-md">
            VOUCH
          </h1>
          <p className="mt-2 max-w-xs text-xs tracking-wider text-slate-400 font-medium uppercase">
            Vetted Open-source Utilities &amp; Comparison Hub
          </p>
        </div>

        {/* Subtle loading indicator */}
        <div
          className={`mt-8 w-16 h-1 rounded bg-slate-800 overflow-hidden transition-all duration-700 delay-500 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-full bg-blue-500 rounded animate-[pulse_1.5s_infinite] w-full" />
        </div>
      </div>
    </div>
  );
}
