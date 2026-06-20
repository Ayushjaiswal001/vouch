import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RepoCard from "@/components/RepoCard";
import type { RepoResult } from "@/lib/api";

const repo: RepoResult = {
  full_name: "KDE/ghostwriter",
  html_url: "https://github.com/KDE/ghostwriter",
  description: "distraction-free markdown editor",
  stars: 4904,
  license: "GPL-3.0",
  pushed_at: "2026-06-01T00:00:00Z",
  created_at: null,
  language: "C++",
  topics: [],
  scorecard: null,
  advisories_count: 0,
  has_high_advisory: false,
  has_critical_advisory: false,
  pc_details: { stack: "C++", win_install_bytes: null, win_install_str: null },
  scores: { total: 0.69, safety: 0.5, popularity: 0.6, maintenance: 1, pc_fit: 0.7 },
};

describe("RepoCard", () => {
  it("links to the detail page and shows meta", () => {
    render(<RepoCard repo={repo} />);
    const detail = screen.getAllByRole("link", { name: /ghostwriter|details/i })[0];
    expect(detail).toHaveAttribute("href", "/repo/KDE/ghostwriter");
    expect(screen.getByText("GPL-3.0")).toBeInTheDocument();
    expect(screen.getByText("4.9k")).toBeInTheDocument();
  });
});
