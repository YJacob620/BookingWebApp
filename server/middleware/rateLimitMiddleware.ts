import { Request, Response, NextFunction } from 'express';

interface RateLimits {
    requests: Record<string, number[]>;
    cleanup: () => void;
}

// Simple in-memory rate limiting
// For production, consider using Redis or a dedicated rate-limiting package
const rateLimits: RateLimits = {
    // Store IP addresses and their request timestamps
    // Structure: { ip: [timestamp1, timestamp2, ...] }
    requests: {},

    // Clean up old requests periodically (every 15 minutes)
    cleanup: function () {
        const now: number = Date.now();
        const keepTime: number = 60 * 60 * 1000; // Keep records for 1 hour

        for (const ip in this.requests) {
            this.requests[ip] = this.requests[ip].filter(timestamp => {
                return now - timestamp < keepTime;
            });

            // Remove empty arrays
            if (this.requests[ip].length === 0) {
                delete this.requests[ip];
            }
        }
    }
};

// Set up cleanup interval
setInterval(() => rateLimits.cleanup(), 15 * 60 * 1000);

/**
 * Create a rate limiter middleware
 * @param maxRequests - Maximum requests allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @returns Express middleware function
 */
const createRateLimiter = (maxRequests: number, windowMs: number) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const ip: string = req.ip || req.connection.remoteAddress || '';
        const now: number = Date.now();

        // Initialize array for this IP if it doesn't exist
        if (!rateLimits.requests[ip]) {
            rateLimits.requests[ip] = [];
        }

        // Filter out requests older than the window
        const recentRequests: number[] = rateLimits.requests[ip].filter(timestamp => {
            return now - timestamp < windowMs;
        });

        // Check if the number of recent requests exceeds the limit
        if (recentRequests.length >= maxRequests) {
            res.status(429).json({
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil(windowMs / 1000)
            });
            return;
        }

        // Add current request timestamp and update the array
        rateLimits.requests[ip] = [...recentRequests, now];

        next();
    };
};

// Create specific rate limiters
const authLimiter = createRateLimiter(10, 5 * 60 * 1000); // 10 requests per 5 minutes
const verificationLimiter = createRateLimiter(5, 60 * 60 * 1000); // 5 requests per hour

export {
    authLimiter,
    verificationLimiter
};