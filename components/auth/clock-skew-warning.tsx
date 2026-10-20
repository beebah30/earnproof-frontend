"use client";

import { useEffect, useRef } from "react";
import type { ClockSkewResult } from "@/lib/time/clock-skew";
import { describeSk } from "@/lib/time/clock-skew";

export interface ClockSkewWarningProps {
  /** The computed skew result, or null if detection failed. */
  result: ClockSkewResult | null;
  /** Called when the user clicks "Retry" after correcting their clock. */
  onRetry?: () => void;
  /** Called when the user dismisses the warning. */
  onDismiss?: () => void;
}

/**
 * Bounded clock-skew warning banner.
 *
 * Renders nothing when the skew is within acceptable tolerance or when detection
 * failed. The warning is informational only: it never alters validation results.
 * It discloses only a bounded, rounded description of the skew and never raw
 * timestamps or precise telemetry.
 */
export function ClockSkewWarning({ result, onRetry, onDismiss }: ClockSkewWarningProps) {
  const retryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (result?.actionable) {
      retryButtonRef.current?.focus();
    }
  }, [result?.actionable]);

  if (!result || !result.actionable) return null;

  const isCritical = result.level === "critical";
  const description = describeSkew(result.signedSkewMs);

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="clock-skew-warning"
      data-level={result.level}
      className={`mt-4 rounded-md border p-4 text-sm ${isCritical ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-amber-500/40 bg-amber-500/10 text-amber-200"}`}
    >
      <p className="font-medium">
        {isCritical ? "Device clock is significantly out of sync" : "Device clock may be out of sync"}
      </p>
      <p className="mt-1 leading-6">{description}</p>
      <p className="mt-1 leading-6">
        Synchronize your device clock (settings → date &amp; time → set automatically),
        then retry. Signature challenges and proof windows depend on an accurate clock.
      </p>
      <div className="mt-3 flex gap-2">
        {onRetry && (
          <button
            ref={retryButtonRef}
            type="button"
            onClick={onRetry}
            className="h9 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20 transition"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="h9-rounded-md border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50 transition"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
