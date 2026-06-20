"use client";

import { useState } from "react";
import SearchClient from "@/app/search/SearchClient";
import AIRecommend from "@/components/AIRecommend";

export default function HomeTabs() {
  const [tab, setTab] = useState<"search" | "ai">("search");
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
        <button
          onClick={() => setTab("search")}
          className={`rounded-md px-4 py-1.5 font-medium ${
            tab === "search" ? "bg-gray-900 text-white" : "text-gray-600"
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`rounded-md px-4 py-1.5 font-medium ${
            tab === "ai" ? "bg-indigo-600 text-white" : "text-gray-600"
          }`}
        >
          Ask AI
        </button>
      </div>
      {tab === "search" ? <SearchClient /> : <AIRecommend />}
    </div>
  );
}
