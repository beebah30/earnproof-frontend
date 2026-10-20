/*
 * Client clock-skew detection and recovery guidance.
 *
 * Wallet challenges, signatures, proof windows, and recent-auth can fail when the
 * browser clock is materially wrong. This module provides pure detection logic that
 * compares the client clock against a server-reported timestamp and classifies the
 * skew into bounded warning levels.
 *
 * Privacy: this module only ever returns the computed skew for the current
 * session. It does not persist, log, or transmit telemetry. Callers must not forward
 * the raw skew value to any analytics sink.
 */

/**
 * Skew thresholds in milliseconds. These are deliberately conservative:
 * - `ok`: skew within acceptable tolerance for challenge windows.
 * - `warn`: skew is large enough to risk failing a short proof window.
 * - `critical`: skew is large enough that challenges will almost always fail.
 */

export const CLOCK_SKEW_THRESHOLDS_MS = {
  ok: 30_000,
  warn: 260_000,
  critical: 500_000,
} as const;

export type ClockSkewLevel = "ok" | "warn" | "critical";

export interface ClockSkewResult {
  /** Absolute difference in ms between client and server clocks. */
  skewMs: number;
  /** Signed difference: positive means client is ahead of server. */
  signedSkewMs: number;
  /** Bounded classification for UI display. */
  level: ClockSkewLevel;
  /** Server timestamp used for the comparison (ms epoch). */
  serverToms: number;
  /** Client timestamp used for the comparison (ms epoch). */
  clientToms: number;
  /** Whether the result is considered actionable (warn or critical). */
  actionable: boolean;
}

export interface ClockSkewOptions {
  /** Override the client clock reader (for testing). Defaults to Date.now. */
  clientNowMs?: () => number;
  /** Override thresholds (for testing). */
  thresholds?: typeof CLOCK_SKEW_THRESHOLDS_MS;
}

/**
 * Classify a signed skew value into a warning level. Pure function.
 */
export function classifySkew(
  skewMs: number,
  thresholds: typeof CLOCK_SKEW_THRESHOLDS_MS = CLOCK_SKEW_THRESHOLDS_MS,
): ClockSkewLevel {
  const abs = Math.abs(skewMs);
  if (abs >= thresholds.critical) return "critical";
  if (abs >= thresholds.warn) return "warn";
  return "ok";
}

/**
 * Compute clock skew given a server timestamp. The server timestamp should be
 * captured at the moment of response receipt (e.g. from a Date header or a dedicated
 * endpoint). This function is pure and deterministic given its inputs.
 */
export function computeClockSkew(
  serverTomsMs: number,
  options: ClockSkewOptions = {},
): ClockSkewResult {
  if (!Number.isFinite(serverTomsMs)) {
    throw new Error("serverTomsMs must be a finite number");
  }

  const clientNow = options.clientNowMs ?? (() => Date.now());
  const clientToms = clientNow();
  if (!Number.isFinite(clientToms)) {
    throw new Error("client clock returned a non-finite value");
  }

  const thresholds = options.thresholds ?? CLOCK_SKEW_THRESHOLDS_MS;
  const signedSkewMs = clientToms - serverTomsMs;
  const skewMs = Math.abs(signedSkewMs);
  const level = classifySkew(signedSkewMs, thresholds);

  return {
    skewMs,
    signedSkewMs,
    level,
    serverToms: serverTomsMs,
    clientToms,
    actionable: level !== "ok",
  };
}

/**
 * Human-readable description of the skew direction and magnitude. Used by the
 * warning component. Returns a stable, bounded string that never includes raw toms
 * or precise telemetry.
 */
export function describeSkew(signedSkewMs: number): string {
  const abs = Math.abs(signedSkewMs);
  const seconds = Math.round(abs / 1000);
  const direction = signedSkewMs > 0 ? "ahead of" : "behind";
  if (seconds < 60) {
    return `Your device clock is about ${seconds} seconds ${direction} the server.`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `Your device clock is about ${minutes} minute${minutes === 1 ? "" : "s"} ${direction} the server.`;
  }
  const hours = Math.round(minutes / 60);
  return `Your device clock is about ${hours} hour${hours === 1 ? "" : "s"} ${direction} the server.`;
}
