import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreCard from "@/components/ScoreCard";
import type { RepoResult } from "@/lib/api";

const repo: RepoResult = {
  full_name: "a/b",
  html_url: "https://github.com/a/b",
  description: "d",
  stars: 1000,
  license: "MIT",
  pushed_at: null,
  created_at: null,
  language: "Rust",
  topics: [],
  scorecard: null,
  advisories_count: 0,
  has_high_advisory: true,
  has_critical_advisory: false,
  pc_details: { stack: "Rust", win_install_bytes: null, win_install_str: null },
  scores: { total: 0.7, safety: 0.5, popularity: 0.6, maintenance: 1, pc_fit: 0.8 },
};

describe("ScoreCard", () => {
  it("shows total and the four factor bars", () => {
    render(<ScoreCard repo={repo} />);
    expect(screen.getByText("70")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Safety" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Lightweight" })).toBeInTheDocument();
    expect(screen.getByText(/high-severity advisory/i)).toBeInTheDocument();
  });
});
