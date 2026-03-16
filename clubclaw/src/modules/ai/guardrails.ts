/**
 * Security guardrails for the AI module.
 *
 * Provides input sanitization, output filtering, rate limiting,
 * and role-based access control.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputResult =
  | { ok: true }
  | { ok: false; reason: 'blocked' | 'too_long' };

export type OutputResult =
  | { ok: true; content: string }
  | { ok: false };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_INPUT_LENGTH = 500;

/**
 * Patterns that indicate prompt-injection or jailbreak attempts.
 * Each pattern is tested against the *normalised* input (lower-cased,
 * whitespace-collapsed).
 */
const BLOCKED_INPUT_PATTERNS: RegExp[] = [
  // Prompt injection
  /ignore your instructions/,
  /ignore previous/,
  /disregard your prompt/,
  /repeat your system prompt/,
  /what are your instructions/,
  /you are now/,
  /pretend you are/,
  /act as if/,
  /show me your prompt/,
  /print your rules/,
  /repeat everything above/,

  // Config / infra probing
  /api key/,
  /(show|tell|give|what|reveal).{0,20}token/,
  /password/,
  /(show|tell|give|what|reveal).{0,20}secret/,
  /reveal the secret/,
  /\.env\b/,
  /yaml config/,
  /what model are you/,
  /system prompt/,
  /brain\.md/,

  // Jailbreak / mode bypass
  /jailbreak/,
  /\bdan mode\b/,
  /developer mode/,
  /roleplay as/,
];

/**
 * Patterns that should never appear in bot output. If any match, the
 * output is suppressed entirely.
 */
const BLOCKED_OUTPUT_PATTERNS: RegExp[] = [
  // API key / token patterns
  /\bsk-[A-Za-z0-9]{10,}/,
  /\bak_[A-Za-z0-9]+/,
  /\$\{[^}]+\}/,
  /\bxoxb-/,
  /\bxoxp-/,

  // System prompt leaks
  /## Security Rules/,
  /## Guardrails/,
  /## Identity/,
  /## Personality/,
  /NEVER OVERRIDE/,
  /buildSystemPrompt/,
  /system prompt/i,

  // Config file references
  /clubclaw\.yaml/,
  /brain\.md/,
  /knowledge\.md/,
  /\.env\b/,
  /vitest\.config/,
  /src\/modules\//,
];

// ---------------------------------------------------------------------------
// sanitizeInput  (Task 2)
// ---------------------------------------------------------------------------

/**
 * Checks user input for prompt-injection patterns and length violations.
 *
 * Returns `{ ok: true }` when the input is safe, or
 * `{ ok: false, reason }` with reason `'blocked'` or `'too_long'`.
 */
export function sanitizeInput(raw: string): InputResult {
  if (raw.length > MAX_INPUT_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }

  // Normalise: lowercase + collapse whitespace
  const normalised = raw.toLowerCase().replace(/\s+/g, ' ').trim();

  for (const pattern of BLOCKED_INPUT_PATTERNS) {
    if (pattern.test(normalised)) {
      return { ok: false, reason: 'blocked' };
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// sanitizeOutput  (Task 3)
// ---------------------------------------------------------------------------

/**
 * Scans bot output for leaked secrets, system-prompt content, and
 * config-file references. Returns the content if safe, or `{ ok: false }`
 * to suppress the response entirely.
 */
export function sanitizeOutput(text: string): OutputResult {
  for (const pattern of BLOCKED_OUTPUT_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false };
    }
  }

  return { ok: true, content: text };
}

// ---------------------------------------------------------------------------
// RateLimiter  (Task 4)
// ---------------------------------------------------------------------------

interface BucketEntry {
  count: number;
  windowStart: number;
}

/**
 * Simple in-memory per-user rate limiter with a sliding window.
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly buckets: Map<string, BucketEntry> = new Map();

  /**
   * @param maxRequests  Maximum number of requests allowed per window.
   * @param windowMs     Window duration in milliseconds (default: 1 hour).
   */
  constructor(maxRequests: number, windowMs: number = 60 * 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Returns `true` if the user is within the rate limit, `false` otherwise.
   * Each call that returns `true` counts as one request.
   */
  check(userId: string): boolean {
    const now = Date.now();
    const entry = this.buckets.get(userId);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      // First request or window expired -- start fresh.
      this.buckets.set(userId, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count < this.maxRequests) {
      entry.count += 1;
      return true;
    }

    return false;
  }
}

// ---------------------------------------------------------------------------
// hasAllowedRole  (Task 5)
// ---------------------------------------------------------------------------

/**
 * Returns `true` if:
 *   - `allowedRoles` is empty (no restriction), or
 *   - any of the user's roles matches any allowed role (case-insensitive).
 */
export function hasAllowedRole(
  allowedRoles: string[],
  userRoles: string[],
): boolean {
  if (allowedRoles.length === 0) return true;

  const allowed = new Set(allowedRoles.map((r) => r.toLowerCase()));

  return userRoles.some((r) => allowed.has(r.toLowerCase()));
}
