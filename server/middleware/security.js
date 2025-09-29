const crypto = require('crypto');
const validator = require('validator');
const logger = require('../utils/logger');

// Security middleware
const securityMiddleware = (req, res, next) => {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Generate and set CSP nonce for inline scripts
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.nonce = nonce;
    
    // Remove server header
    res.removeHeader('X-Powered-By');
    
    // Log suspicious activity
    if (containsSuspiciousPatterns(req)) {
        logger.warn('Suspicious request detected', {
            ip: req.ip,
            url: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
            headers: req.headers
        });
    }
    
    next();
};

// CSRF Protection middleware
const csrfProtection = (req, res, next) => {
    // Skip CSRF for GET requests and health checks
    if (req.method === 'GET' || req.path.startsWith('/health')) {
        return next();
    }
    
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session.csrfToken;
    
    if (!token || !sessionToken || token !== sessionToken) {
        return res.status(403).json({
            success: false,
            error: 'CSRF token missing or invalid',
            code: 'CSRF_INVALID'
        });
    }
    
    next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }
        
        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }
        
        next();
    } catch (error) {
        logger.error('Input sanitization error:', error);
        res.status(400).json({
            success: false,
            error: 'Invalid input format',
            code: 'INPUT_INVALID'
        });
    }
};

// SQL Injection protection
const sqlInjectionProtection = (req, res, next) => {
    const checkValue = (value) => {
        if (typeof value === 'string') {
            const sqlPatterns = [
                /('|(\\')|(--)|(-{2})|(;)|(\|)|(\*)|(%)|(\+))/i,
                /(select|insert|update|delete|drop|create|alter|exec|execute|union|script)/i,
                /(<|>|script|javascript|vbscript|onload|onerror)/i
            ];
            
            return sqlPatterns.some(pattern => pattern.test(value));
        }
        return false;
    };
    
    const checkObject = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (typeof value === 'object' && value !== null) {
                    if (checkObject(value)) return true;
                } else if (checkValue(value) || checkValue(key)) {
                    return true;
                }
            }
        }
        return false;
    };
    
    // Check request body
    if (req.body && checkObject(req.body)) {
        logger.warn('SQL injection attempt detected', {
            ip: req.ip,
            url: req.originalUrl,
            body: req.body
        });
        return res.status(400).json({
            success: false,
            error: 'Invalid characters detected in input',
            code: 'SQL_INJECTION_DETECTED'
        });
    }
    
    // Check query parameters
    if (req.query && checkObject(req.query)) {
        logger.warn('SQL injection attempt in query parameters', {
            ip: req.ip,
            url: req.originalUrl,
            query: req.query
        });
        return res.status(400).json({
            success: false,
            error: 'Invalid characters detected in query parameters',
            code: 'SQL_INJECTION_DETECTED'
        });
    }
    
    next();
};

// XSS Protection middleware
const xssProtection = (req, res, next) => {
    const checkXSS = (value) => {
        if (typeof value === 'string') {
            const xssPatterns = [
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /<\s*\w.*?on\w+\s*=.*?>/gi
            ];
            
            return xssPatterns.some(pattern => pattern.test(value));
        }
        return false;
    };
    
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            return validator.escape(value);
        }
        return value;
    };
    
    const processObject = (obj) => {
        const result = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (typeof value === 'object' && value !== null) {
                    result[key] = processObject(value);
                } else if (checkXSS(value)) {
                    logger.warn('XSS attempt detected', {
                        ip: req.ip,
                        url: req.originalUrl,
                        field: key,
                        value: value
                    });
                    result[key] = sanitizeValue(value);
                } else {
                    result[key] = value;
                }
            }
        }
        return result;
    };
    
    // Process request body
    if (req.body && typeof req.body === 'object') {
        req.body = processObject(req.body);
    }
    
    // Process query parameters
    if (req.query && typeof req.query === 'object') {
        req.query = processObject(req.query);
    }
    
    next();
};

// File upload security
const fileUploadSecurity = (req, res, next) => {
    if (req.files || (req.body && req.body.files)) {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain'
        ];
        
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        
        const files = req.files || req.body.files || [];
        
        for (const file of Object.values(files)) {
            // Check file type
            if (!allowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    error: 'File type not allowed',
                    code: 'INVALID_FILE_TYPE'
                });
            }
            
            // Check file size
            if (file.size > maxFileSize) {
                return res.status(400).json({
                    success: false,
                    error: 'File size exceeds limit',
                    code: 'FILE_TOO_LARGE'
                });
            }
            
            // Check filename for suspicious patterns
            if (containsSuspiciousPatterns({ originalUrl: file.name })) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid filename',
                    code: 'INVALID_FILENAME'
                });
            }
        }
    }
    
    next();
};

// Brute force protection
const bruteForceProtection = () => {
    const attempts = new Map();
    const MAX_ATTEMPTS = 5;
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    const BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes
    
    return (req, res, next) => {
        const key = `${req.ip}-${req.path}`;
        const now = Date.now();
        
        if (attempts.has(key)) {
            const attempt = attempts.get(key);
            
            // If still blocked
            if (attempt.blockedUntil && now < attempt.blockedUntil) {
                return res.status(429).json({
                    success: false,
                    error: 'Too many attempts. Please try again later.',
                    code: 'RATE_LIMITED',
                    retryAfter: Math.ceil((attempt.blockedUntil - now) / 1000)
                });
            }
            
            // Reset if window expired
            if (now - attempt.firstAttempt > WINDOW_MS) {
                attempts.delete(key);
            } else {
                attempt.count++;
                attempt.lastAttempt = now;
                
                // Block if max attempts reached
                if (attempt.count >= MAX_ATTEMPTS) {
                    attempt.blockedUntil = now + BLOCK_DURATION;
                    logger.warn('IP blocked due to brute force attempts', {
                        ip: req.ip,
                        path: req.path,
                        attempts: attempt.count
                    });
                    
                    return res.status(429).json({
                        success: false,
                        error: 'Too many attempts. Please try again later.',
                        code: 'RATE_LIMITED',
                        retryAfter: BLOCK_DURATION / 1000
                    });
                }
            }
        } else {
            attempts.set(key, {
                count: 1,
                firstAttempt: now,
                lastAttempt: now
            });
        }
        
        next();
    };
};

// Helper functions
function containsSuspiciousPatterns(req) {
    const suspiciousPatterns = [
        /\.\./,  // Directory traversal
        /\/etc\/passwd/,
        /\/proc\/version/,
        /cmd\.exe/,
        /powershell/,
        /wget|curl/,
        /<script/i,
        /javascript:/i,
        /vbscript:/i
    ];
    
    const checkString = (str) => {
        return suspiciousPatterns.some(pattern => pattern.test(str));
    };
    
    return checkString(req.originalUrl) || 
           checkString(req.get('User-Agent') || '') ||
           checkString(req.get('Referer') || '');
}

function sanitizeObject(obj) {
    const sanitized = {};
    
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            
            if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else if (typeof value === 'string') {
                // Basic sanitization
                sanitized[key] = value
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                    .trim();
            } else {
                sanitized[key] = value;
            }
        }
    }
    
    return sanitized;
}

// Export middleware
module.exports = securityMiddleware;
module.exports.csrfProtection = csrfProtection;
module.exports.sanitizeInput = sanitizeInput;
module.exports.sqlInjectionProtection = sqlInjectionProtection;
module.exports.xssProtection = xssProtection;
module.exports.fileUploadSecurity = fileUploadSecurity;
module.exports.bruteForceProtection = bruteForceProtection;