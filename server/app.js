const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();

// Import custom modules
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const securityMiddleware = require('./middleware/security');
const rateLimitMiddleware = require('./middleware/rateLimit');

// Import routes
const apiRoutes = require('./routes/api');
const contactRoutes = require('./routes/contact');
const healthRoutes = require('./routes/health');
const servicesApiMiddleware = require('./middleware/lunasphere-api');

// Initialize Express app
const app = express();

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'lunasphere-secret-key';

// Trust proxy (important for deployment behind reverse proxy)
app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '../'));

// Basic security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            childSrc: ["'self'"],
            workerSrc: ["'self'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'https://lunasphere.com',
            'https://www.lunasphere.com'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Cookie parser
app.use(cookieParser());

// Session middleware
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Logging middleware
if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// Custom security middleware
app.use(securityMiddleware);

// Rate limiting
app.use('/api/', rateLimitMiddleware.api);
app.use('/api/contact', rateLimitMiddleware.contact);

// Static file serving
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: NODE_ENV === 'production' ? '1y' : '0',
    etag: true,
    lastModified: true
}));

app.use('/css', express.static(path.join(__dirname, '../css'), {
    maxAge: NODE_ENV === 'production' ? '1y' : '0',
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

app.use('/js', express.static(path.join(__dirname, '../js'), {
    maxAge: NODE_ENV === 'production' ? '1y' : '0',
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

app.use('/assets', express.static(path.join(__dirname, '../assets'), {
    maxAge: NODE_ENV === 'production' ? '30d' : '0'
}));

// Health check routes (must be before other routes)
app.use('/health', healthRoutes);

// API routes
app.use('/api', apiRoutes);
app.use('/api/services', servicesApiMiddleware);

// Main route - serve index.html
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, '../index.html');
    console.log('🔍 Serving HTML from:', filePath);
    
    // Disable caching in development
    if (NODE_ENV === 'development') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    res.sendFile(filePath);
});

// Handle client-side routing (SPA support)
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.url.startsWith('/api/') || req.url.startsWith('/health/')) {
        return next();
    }
    
    // Check if it's a static file request
    const ext = path.extname(req.url);
    if (ext) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    // Serve index.html for client-side routing
    // Disable caching in development
    if (NODE_ENV === 'development') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

// Global 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `The requested page ${req.originalUrl} does not exist`
    });
});

// Start server
const server = app.listen(PORT, () => {
    logger.info(`🌙 LunaSphere server running on port ${PORT}`);
    logger.info(`🚀 Environment: ${NODE_ENV}`);
    logger.info(`🔗 Local: http://localhost:${PORT}`);
    
    if (NODE_ENV === 'development') {
        logger.info('🛠️  Development mode - auto-restart enabled');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Export app for testing
module.exports = app;