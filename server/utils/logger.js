const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += `\n${JSON.stringify(meta, null, 2)}`;
        }
        return msg;
    })
);

// Create transports
const transports = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug'
        })
    );
}

// File transports for production
transports.push(
    // Combined logs (all levels)
    new DailyRotateFile({
        filename: path.join(logsDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: customFormat,
        level: 'info'
    }),
    
    // Error logs only
    new DailyRotateFile({
        filename: path.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: customFormat,
        level: 'error'
    }),
    
    // Security logs
    new DailyRotateFile({
        filename: path.join(logsDir, 'security-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '90d',
        format: customFormat,
        level: 'warn',
        // Custom filter for security-related logs
        filter: (info) => {
            return info.message?.includes('security') || 
                   info.message?.includes('suspicious') || 
                   info.message?.includes('blocked') ||
                   info.message?.includes('attack') ||
                   info.message?.includes('threat');
        }
    }),
    
    // Access logs
    new DailyRotateFile({
        filename: path.join(logsDir, 'access-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '7d',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        // Custom filter for access logs
        filter: (info) => {
            return info.message?.includes('GET') || 
                   info.message?.includes('POST') || 
                   info.message?.includes('PUT') ||
                   info.message?.includes('DELETE');
        }
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    transports,
    exitOnError: false,
    
    // Handle uncaught exceptions
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d'
        })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d'
        })
    ]
});

// Custom logging methods
logger.security = (message, meta = {}) => {
    logger.warn(`[SECURITY] ${message}`, {
        ...meta,
        type: 'security',
        timestamp: new Date().toISOString()
    });
};

logger.access = (req, res, responseTime) => {
    const logData = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: res.get('content-length') || 0,
        referrer: req.get('Referrer') || req.get('Referer'),
        timestamp: new Date().toISOString()
    };
    
    // Log as info for successful requests, warn for client errors, error for server errors
    if (res.statusCode >= 500) {
        logger.error(`${req.method} ${req.originalUrl} ${res.statusCode}`, logData);
    } else if (res.statusCode >= 400) {
        logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode}`, logData);
    } else {
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, logData);
    }
};

logger.performance = (operation, duration, meta = {}) => {
    logger.info(`[PERFORMANCE] ${operation} completed in ${duration}ms`, {
        ...meta,
        operation,
        duration,
        type: 'performance',
        timestamp: new Date().toISOString()
    });
};

logger.audit = (action, user, meta = {}) => {
    logger.info(`[AUDIT] ${action}`, {
        ...meta,
        action,
        user: user || 'anonymous',
        type: 'audit',
        timestamp: new Date().toISOString()
    });
};

logger.business = (event, data = {}) => {
    logger.info(`[BUSINESS] ${event}`, {
        ...data,
        event,
        type: 'business',
        timestamp: new Date().toISOString()
    });
};

// Middleware to automatically log requests
logger.requestMiddleware = () => {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // Store original end function
        const originalEnd = res.end;
        
        // Override end function to log when response is sent
        res.end = function(chunk, encoding) {
            res.end = originalEnd;
            const responseTime = Date.now() - startTime;
            
            // Log the request
            logger.access(req, res, responseTime);
            
            // Call original end function
            res.end(chunk, encoding);
        };
        
        next();
    };
};

// Stream for Morgan HTTP logger
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Method to change log level dynamically
logger.setLevel = (level) => {
    logger.level = level;
    logger.info(`Log level changed to: ${level}`);
};

// Method to get current log level
logger.getLevel = () => {
    return logger.level;
};

// Method to flush all logs
logger.flush = () => {
    return new Promise((resolve) => {
        logger.on('finish', resolve);
        logger.end();
    });
};

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Gracefully shutting down logger...');
    await logger.flush();
});

process.on('SIGTERM', async () => {
    logger.info('Gracefully shutting down logger...');
    await logger.flush();
});

// Log startup message
logger.info('Logger initialized', {
    level: logger.level,
    environment: process.env.NODE_ENV || 'development',
    logsDirectory: logsDir
});

module.exports = logger;