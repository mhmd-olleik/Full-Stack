// Rate Limiter for API endpoints
// Prevents brute force attacks and abuse
// Note: In Vercel serverless, in-memory store resets on cold starts.
// This provides best-effort rate limiting within a warm function instance.

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

interface RateLimitConfig {
    windowMs: number;  // Time window in milliseconds
    maxRequests: number;  // Max requests per window
}

export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const key = identifier;

    // Clean up expired entry if found
    if (store[key] && store[key].resetTime < now) {
        delete store[key];
    }

    if (!store[key]) {
        store[key] = {
            count: 1,
            resetTime: now + config.windowMs,
        };
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetIn: config.windowMs,
        };
    }

    store[key].count++;

    if (store[key].count > config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: store[key].resetTime - now,
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - store[key].count,
        resetIn: store[key].resetTime - now,
    };
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
    api: { windowMs: 60 * 1000, maxRequests: 60 },  // 60 requests per minute
};
