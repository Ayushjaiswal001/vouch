import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIRecommend from "@/components/AIRecommend";
import * as api from "@/lib/api";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AIRecommend", () => {
  it("submits a query and renders the recommendation", async () => {
    vi.spyOn(api, "fetchRecommend").mockResolvedValue({
      ok: true,
      mode: "fallback",
      query: "editors",
      summary: "ranked offline",
      picks: [{ full_name: "a/one", recommendation: "solid", pros: ["fast"], cons: ["new"] }],
      repos: [],
      auth: false,
    });
    const user = userEvent.setup();
    render(<AIRecommend />);
    await user.type(screen.getByLabelText("ask ai query"), "editors");
    await user.click(screen.getByRole("button", { name: /ask ai/i }));
    expect(await screen.findByText("ranked offline")).toBeInTheDocument();
    expect(screen.getByText("a/one")).toBeInTheDocument();
    expect(screen.getByText("Heuristic ranking")).toBeInTheDocument();
    expect(screen.getByText("+ fast")).toBeInTheDocument();
  });
});
