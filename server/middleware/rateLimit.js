const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create rate limiter with custom key generator
const createRateLimiter = (options) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
        max: options.max || 100,
        message: {
            success: false,
            error: options.message || 'Too many requests from this IP, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(options.windowMs / 1000) || 900
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            // Use IP + User-Agent for more granular rate limiting
            return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
        },
        handler: (req, res) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
                method: req.method
            });
            
            res.status(429).json({
                success: false,
                error: options.message || 'Too many requests from this IP, please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(options.windowMs / 1000) || 900
            });
        },
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path.startsWith('/health');
        },
        // onLimitReached is deprecated in express-rate-limit v7
    });
};

// General API rate limiter
const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many API requests from this IP, please try again later.'
});

// Contact form rate limiter (more restrictive)
const contactLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 contact form submissions per hour
    message: 'Too many contact form submissions from this IP, please try again later.'
});

// Login rate limiter (very restrictive)
const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts from this IP, please try again later.'
});

// Newsletter signup rate limiter
const newsletterLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 newsletter signups per hour
    message: 'Too many newsletter signup attempts from this IP, please try again later.'
});

// File upload rate limiter
const uploadLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 file uploads per hour
    message: 'Too many file upload attempts from this IP, please try again later.'
});

// Search rate limiter
const searchLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 search requests per 5 minutes
    message: 'Too many search requests from this IP, please try again later.'
});

// Aggressive rate limiter for suspicious activity
const suspiciousActivityLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1, // 1 request per hour for suspicious activity
    message: 'Suspicious activity detected. Access temporarily restricted.'
});

// Dynamic rate limiter based on endpoint
const dynamicRateLimiter = (req, res, next) => {
    const path = req.path;
    const method = req.method;
    
    // Apply different limits based on endpoint
    if (path.includes('/contact') && method === 'POST') {
        return contactLimiter(req, res, next);
    } else if (path.includes('/login') && method === 'POST') {
        return loginLimiter(req, res, next);
    } else if (path.includes('/newsletter') && method === 'POST') {
        return newsletterLimiter(req, res, next);
    } else if (path.includes('/upload') && method === 'POST') {
        return uploadLimiter(req, res, next);
    } else if (path.includes('/search')) {
        return searchLimiter(req, res, next);
    } else {
        return apiLimiter(req, res, next);
    }
};

// IP whitelist middleware
const ipWhitelist = (whitelist = []) => {
    return (req, res, next) => {
        if (whitelist.length === 0) {
            return next();
        }
        
        const clientIp = req.ip;
        
        if (whitelist.includes(clientIp)) {
            return next();
        }
        
        logger.warn('IP not in whitelist', {
            ip: clientIp,
            url: req.originalUrl
        });
        
        res.status(403).json({
            success: false,
            error: 'Access denied',
            code: 'IP_NOT_WHITELISTED'
        });
    };
};

// IP blacklist middleware
const ipBlacklist = (blacklist = []) => {
    return (req, res, next) => {
        const clientIp = req.ip;
        
        if (blacklist.includes(clientIp)) {
            logger.warn('Blacklisted IP attempted access', {
                ip: clientIp,
                url: req.originalUrl
            });
            
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                code: 'IP_BLACKLISTED'
            });
        }
        
        next();
    };
};

// Adaptive rate limiter that adjusts based on server load
class AdaptiveRateLimiter {
    constructor() {
        this.baseLimit = 100;
        this.currentLimit = this.baseLimit;
        this.windowMs = 15 * 60 * 1000;
        this.lastCheck = Date.now();
        this.checkInterval = 60 * 1000; // Check every minute
    }
    
    middleware() {
        return (req, res, next) => {
            this.adjustLimit();
            
            const limiter = createRateLimiter({
                windowMs: this.windowMs,
                max: this.currentLimit,
                message: `Server is under high load. Limit adjusted to ${this.currentLimit} requests per 15 minutes.`
            });
            
            limiter(req, res, next);
        };
    }
    
    adjustLimit() {
        const now = Date.now();
        
        if (now - this.lastCheck < this.checkInterval) {
            return;
        }
        
        this.lastCheck = now;
        
        // Get server metrics (simplified - in production use proper monitoring)
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
        
        // Adjust limit based on memory usage
        if (memoryUsagePercent > 0.8) {
            this.currentLimit = Math.max(10, this.baseLimit * 0.2);
        } else if (memoryUsagePercent > 0.6) {
            this.currentLimit = Math.max(25, this.baseLimit * 0.5);
        } else if (memoryUsagePercent > 0.4) {
            this.currentLimit = Math.max(50, this.baseLimit * 0.8);
        } else {
            this.currentLimit = this.baseLimit;
        }
        
        logger.info('Rate limit adjusted', {
            memoryUsagePercent: Math.round(memoryUsagePercent * 100),
            currentLimit: this.currentLimit
        });
    }
}

// Export all rate limiters
module.exports = {
    api: apiLimiter,
    contact: contactLimiter,
    login: loginLimiter,
    newsletter: newsletterLimiter,
    upload: uploadLimiter,
    search: searchLimiter,
    suspicious: suspiciousActivityLimiter,
    dynamic: dynamicRateLimiter,
    ipWhitelist,
    ipBlacklist,
    AdaptiveRateLimiter,
    createRateLimiter
};