import { NextResponse } from 'next/server';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
  retryAfterSeconds?: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetTimeMs: number }>;
  reset?(key: string): Promise<void>;
}

/**
 * In-memory sliding-window rate limit store.
 * Suitable for single-instance / local capstone deployments.
 * Note: limits reset on server restart and are not shared across clusters.
 * Designed to be replaced with RedisRateLimitStore in multi-instance production.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private hits: Map<string, { count: number; resetTimeMs: number }> = new Map();
  private lastCleanup: number = Date.now();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTimeMs: number }> {
    const now = Date.now();
    this.evictExpired(now);

    const record = this.hits.get(key);
    if (!record || record.resetTimeMs <= now) {
      const newRecord = { count: 1, resetTimeMs: now + windowMs };
      this.hits.set(key, newRecord);
      return newRecord;
    }

    record.count += 1;
    return record;
  }

  async reset(key: string): Promise<void> {
    this.hits.delete(key);
  }

  private evictExpired(now: number): void {
    // Run cleanup once every 60 seconds at most
    if (now - this.lastCleanup < 60_000) return;
    this.lastCleanup = now;

    for (const [key, record] of this.hits.entries()) {
      if (record.resetTimeMs <= now) {
        this.hits.delete(key);
      }
    }
  }
}

// Global store instance (pluggable)
let currentStore: RateLimitStore = new MemoryRateLimitStore();

export function setRateLimitStore(store: RateLimitStore): void {
  currentStore = store;
}

export function getRateLimitStore(): RateLimitStore {
  return currentStore;
}

export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
}

/**
 * Configurable rate limit policies with environment variable overrides.
 */
export const RATE_LIMIT_CONFIG = {
  // Login: By IP (anti-spray) and By Account (anti-bruteforce)
  loginIp: {
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_IP_WINDOW_MS || '900000', 10), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_LOGIN_IP_MAX || '10', 10),
  },
  loginAccount: {
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_ACCT_WINDOW_MS || '900000', 10), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_LOGIN_ACCT_MAX || '5', 10),
  },
  // Registration: Stricter IP rate limiting
  registerIp: {
    windowMs: parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW_MS || '3600000', 10), // 1 hr
    maxRequests: parseInt(process.env.RATE_LIMIT_REGISTER_MAX || '3', 10),
  },
  // Password Reset / Recovery
  passwordReset: {
    windowMs: parseInt(process.env.RATE_LIMIT_PW_RESET_WINDOW_MS || '900000', 10), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_PW_RESET_MAX || '5', 10),
  },
  // General authenticated API usage
  apiGeneral: {
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10), // 1 min
    maxRequests: parseInt(process.env.RATE_LIMIT_API_MAX || '120', 10),
  },
  // Sensitive file uploads
  fileUpload: {
    windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS || '60000', 10), // 1 min
    maxRequests: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '10', 10),
  },
} as const;

/**
 * Safely resolves the client IP address.
 */
export function getClientIp(request: Request): string {
  // Only trust X-Forwarded-For if explicitly configured with a trusted proxy
  const trustedProxies = process.env.TRUSTED_PROXY_IPS?.split(',').map((p) => p.trim());
  const xForwardedFor = request.headers.get('x-forwarded-for');

  if (xForwardedFor && trustedProxies && trustedProxies.length > 0) {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim());
    return ips[0] || '127.0.0.1';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Checks a single key against a given rate limit policy.
 */
export async function checkRateLimit(
  key: string,
  policy: RateLimitPolicy
): Promise<RateLimitResult> {
  const store = getRateLimitStore();
  const { count, resetTimeMs } = await store.increment(key, policy.windowMs);

  const allowed = count <= policy.maxRequests;
  const remaining = Math.max(0, policy.maxRequests - count);
  const now = Date.now();
  const retryAfterSeconds = allowed ? undefined : Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

  return {
    allowed,
    limit: policy.maxRequests,
    remaining,
    resetTimeMs,
    retryAfterSeconds,
  };
}

/**
 * Evaluates dual rate limiting (IP-based and Account-based) for login or credential sensitive actions.
 * If either fails, returns allowed: false with the stricter Retry-After duration.
 */
export async function checkDualRateLimit(params: {
  ip: string;
  account?: string;
  ipPolicy: RateLimitPolicy;
  accountPolicy?: RateLimitPolicy;
}): Promise<RateLimitResult> {
  // 1. Check IP rate limit
  const ipResult = await checkRateLimit(`rl:ip:${params.ip}`, params.ipPolicy);
  if (!ipResult.allowed) {
    return ipResult;
  }

  // 2. Check Account rate limit if account identifier provided
  if (params.account && params.accountPolicy) {
    const normalizedAccount = params.account.trim().toLowerCase();
    const acctResult = await checkRateLimit(`rl:acct:${normalizedAccount}`, params.accountPolicy);
    if (!acctResult.allowed) {
      return acctResult;
    }
    // Return composite: least remaining tokens
    return {
      allowed: true,
      limit: Math.min(ipResult.limit, acctResult.limit),
      remaining: Math.min(ipResult.remaining, acctResult.remaining),
      resetTimeMs: Math.max(ipResult.resetTimeMs, acctResult.resetTimeMs),
    };
  }

  return ipResult;
}

/**
 * Helper to construct an HTTP 429 Too Many Requests response with standard headers.
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(result.resetTimeMs / 1000).toString());

  if (result.retryAfterSeconds) {
    headers.set('Retry-After', result.retryAfterSeconds.toString());
  }

  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down and try again later.',
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers,
    }
  );
}
