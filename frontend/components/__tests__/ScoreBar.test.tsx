import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreBar from "@/components/ScoreBar";

describe("ScoreBar", () => {
  it("renders label and clamps to a percentage", () => {
    render(<ScoreBar label="safety" value={0.83} />);
    expect(screen.getByText("safety")).toBeInTheDocument();
    const meter = screen.getByRole("meter", { name: "safety" });
    expect(meter).toHaveAttribute("aria-valuenow", "83");
  });

  it("clamps out-of-range values", () => {
    render(<ScoreBar label="x" value={2} />);
    expect(screen.getByRole("meter", { name: "x" })).toHaveAttribute("aria-valuenow", "100");
  });
});
