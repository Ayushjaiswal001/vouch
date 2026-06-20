import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VsComparison from "@/components/VsComparison";
import type { RepoResult } from "@/lib/api";

function repo(name: string, total: number): RepoResult {
  return {
    full_name: name,
    html_url: `https://github.com/${name}`,
    description: "d",
    stars: 5000,
    license: "MIT",
    pushed_at: null,
    created_at: null,
    language: "Rust",
    topics: [],
    scorecard: null,
    advisories_count: 0,
    has_high_advisory: false,
    has_critical_advisory: false,
    pc_details: { stack: "Rust", win_install_bytes: null, win_install_str: null },
    scores: { total, safety: total, popularity: total, maintenance: total, pc_fit: total },
  };
}

describe("VsComparison", () => {
  it("renders both repos and names the higher-trust winner", () => {
    render(<VsComparison a={repo("a/one", 0.9)} b={repo("b/two", 0.5)} />);
    expect(screen.getAllByText("a/one").length).toBeGreaterThan(0);
    expect(screen.getByText(/a\/one edges ahead/)).toBeInTheDocument();
  });

  it("handles a tie", () => {
    render(<VsComparison a={repo("a/one", 0.7)} b={repo("b/two", 0.7)} />);
    expect(screen.getByText(/score identically overall/)).toBeInTheDocument();
  });
});
