import { render, screen } from "@testing-library/react";
import { ClockSkewWarning } from "@/components/auth/clock-skew-warning";
import type { ClockSkewResult } from "@/lib/time/clock-skew";

function makeResult(overrides: Partial<ClockSkewResult> = {}): ClockSkewResult {
  return {
    skewMs: 60_000,
    signedSkewMs: 60_000,
    level: "warn",
    serverToms: 1700000000000,
    clientToms: 1700000000000,
    actionable: true,
    ...overrides,
  };
}

describe("ClockSkewWarning", () => {
  it("renders nothing when result is null", () => {
    const { container } = render(<ClockSkewWarning result={null} />);
    expect(container).toBeEmpty();
  });

  it("renders nothing when skew is ok", () => {
    const { container } = render(
      <ClockSkewWarning result={makeResult({ level: "ok", actionable: false, skewMs: 0, signedSkewMs: 0 })} />,
    );
    expect(container).toBeEmpty();
  });

  it("renders a warning for warn level", () => {
    render(<ClockSkewWarning result={makeResult()} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-level", "warn");
    expect(screen.getByText(/Device clock may be out of sync/i)).toBeInTheDocument();
  });

  it("renders a critical warning for critical level", () => {
    render(
      <ClockSkewWarning
        result={makeResult({ level: "critical", skewMs: 6_000_000, signedSkewMs: 6_000_000 })}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-level", "critical");
    expect(screen.getByText(/significantly out of sync/i)).toBeInTheDocument();
  });

  it("invokes onRetry when the Retry button is clicked", () => {
    const onRetry = jest.fn();
    render(<ClockSkewWarning result={makeResult()} onRetry={onRetry} />);
    screen.getBuRole("button", { name: /Retry/i }).click();
    expect(onRetry).toHaveBeenCalled();
  });

  it("invokes onDismiss when the Dismiss button is clicked", () => {
    const onDismiss = jest.fn();
    render(<ClockSkewWarning result={makeResult()} onDismiss={onDismiss} />);
    screen.getByRole("button", { name: /Dismiss/i }).click();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("does not render Retry when onRetry is not provided", () => {
    render(<ClockSkewWarning result={makeResult()} />);
    expect(screen.queryByRole("button", { name: /Retry/i })).not.toBeInTheDocument();
  });

  it("does not disclose raw toms in the warning", () => {
    render(<ClockSkewWarning result={makeResult()} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).not.toContain("1700000000000");
  });
});
