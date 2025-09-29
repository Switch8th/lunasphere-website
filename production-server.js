const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting LunaSphere production server...');

// Production security middleware
app.set('trust proxy', 1);

// Rate limiting for production
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.',
        code: 'LOGIN_RATE_LIMIT'
    }
});

// Apply rate limiting
app.use('/api/login', authLimiter);
app.use('/api', generalLimiter);

// In-memory data storage (replace with database in production)
let users = [
    {
        id: '1',
        username: process.env.ADMIN_USERNAME || 'admin',
        password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'lunasphere2025!', 12),
        role: 'super-admin',
        registeredAt: new Date().toISOString(),
        assignedBy: 'system'
    }
];

let analytics = {
    totalVisitors: 0,
    pageViews: 0,
    registeredUsers: 1,
    onlineNow: 0
};

let visitors = [];

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers for production
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Remove server header
    res.removeHeader('X-Powered-By');
    
    next();
});

// Static files with caching for production
const staticOptions = {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
};

app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/css', express.static(path.join(__dirname, 'css'), staticOptions));
app.use('/js', express.static(path.join(__dirname, 'js'), staticOptions));
app.use('/assets', express.static(path.join(__dirname, 'assets'), staticOptions));

// CORS headers for API
app.use('/api', (req, res, next) => {
    const allowedOrigins = [
        'https://lunasphere.top',
        'https://www.lunasphere.top',
        'http://localhost:3000'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

// Visitor tracking middleware
app.use((req, res, next) => {
    // Skip tracking for static assets and API calls
    if (!req.url.startsWith('/api/') && !req.url.includes('.') && req.method === 'GET') {
        const visitorId = req.ip + '_' + req.headers['user-agent'];
        const existingVisitor = visitors.find(v => v.id === visitorId);
        
        if (!existingVisitor) {
            const visitor = {
                id: visitorId,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                location: 'Unknown', // In production, use IP geolocation service
                timestamp: new Date().toISOString(),
                lastActivity: Date.now(),
                pages: [req.url]
            };
            visitors.push(visitor);
            analytics.totalVisitors++;
        } else {
            existingVisitor.lastActivity = Date.now();
            if (!existingVisitor.pages.includes(req.url)) {
                existingVisitor.pages.push(req.url);
            }
        }
        
        analytics.pageViews++;
        
        // Clean up old visitors (older than 24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        visitors = visitors.filter(v => v.lastActivity > oneDayAgo);
        
        // Update online count
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        analytics.onlineNow = visitors.filter(v => v.lastActivity > fiveMinutesAgo).length;
    }
    
    next();
});

// ===== API ROUTES =====

// Login endpoint with enhanced security
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt for username:', username, 'from IP:', req.ip);
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username and password are required'
        });
    }
    
    const user = users.find(u => u.username === username);
    if (!user) {
        console.log('❌ User not found:', username);
        // Use same delay as valid user to prevent timing attacks
        bcrypt.compareSync('dummy', '$2a$12$dummy.hash.to.prevent.timing');
        return res.status(401).json({
            success: false,
            error: 'Invalid username or password'
        });
    }
    
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
        console.log('❌ Invalid password for:', username);
        return res.status(401).json({
            success: false,
            error: 'Invalid username or password'
        });
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('✅ Login successful for:', username);
    res.json({
        success: true,
        user: userWithoutPassword,
        message: 'Login successful'
    });
});

// Get all users (admin only)
app.get('/api/users', (req, res) => {
    console.log('👥 Fetching all users from IP:', req.ip);
    
    // In production, add proper authentication middleware here
    
    // Return users without passwords
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    
    res.json(usersWithoutPasswords);
});

// Create new user (signup)
app.post('/api/users', (req, res) => {
    const { username, password, role = 'user' } = req.body;
    
    console.log('📝 Creating new user:', username, 'from IP:', req.ip);
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username and password are required'
        });
    }
    
    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 8 characters long'
        });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        return res.status(409).json({
            success: false,
            error: 'Username already exists'
        });
    }
    
    // Create new user with stronger password hashing
    const newUser = {
        id: uuidv4(),
        username,
        password: bcrypt.hashSync(password, 12),
        role,
        registeredAt: new Date().toISOString(),
        assignedBy: 'self-registration'
    };
    
    users.push(newUser);
    analytics.registeredUsers = users.length;
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    
    console.log('✅ User created successfully:', username);
    res.status(201).json({
        success: true,
        user: userWithoutPassword,
        message: 'Account created successfully'
    });
});

// Update user role (admin only)
app.put('/api/users/:username/role', (req, res) => {
    const { username } = req.params;
    const { role, assignedBy } = req.body;
    
    console.log('🔄 Updating role for user:', username, 'to:', role, 'from IP:', req.ip);
    
    // In production, add proper authentication and authorization middleware here
    
    if (!role) {
        return res.status(400).json({
            success: false,
            error: 'Role is required'
        });
    }
    
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }
    
    // Update user role
    users[userIndex] = {
        ...users[userIndex],
        role,
        assignedBy: assignedBy || 'system'
    };
    
    console.log('✅ Role updated successfully for:', username);
    res.json({
        success: true,
        message: 'Role updated successfully',
        user: { ...users[userIndex], password: undefined }
    });
});

// Get analytics
app.get('/api/analytics', (req, res) => {
    analytics.registeredUsers = users.length;
    
    res.json(analytics);
});

// Get visitors
app.get('/api/visitors', (req, res) => {
    // Return sanitized visitor data (remove sensitive info)
    const sanitizedVisitors = visitors.map(v => ({
        id: v.id.split('_')[0] + '_' + Date.now(), // Anonymize
        location: v.location,
        timestamp: v.timestamp,
        pages: v.pages?.length || 1,
        online: Date.now() - v.lastActivity < 5 * 60 * 1000
    }));
    
    res.json(sanitizedVisitors.slice(0, 50)); // Limit to 50 most recent
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production',
        version: '1.0.0',
        users: users.length,
        visitors: visitors.length
    });
});

// API info
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'LunaSphere API v1.0',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            login: 'POST /api/login',
            users: 'GET /api/users',
            signup: 'POST /api/users',
            updateRole: 'PUT /api/users/:username/role',
            analytics: 'GET /api/analytics',
            visitors: 'GET /api/visitors',
            health: 'GET /health'
        }
    });
});

// Contact form
app.post('/api/contact', (req, res) => {
    console.log('📧 Contact form submission from IP:', req.ip, req.body);
    
    // In production, implement proper email sending
    res.json({
        success: true,
        message: 'Thank you for your message! We will get back to you soon.',
        data: {
            submissionId: 'LUNA_' + Date.now().toString(36),
            timestamp: new Date().toISOString()
        }
    });
});

// Main route - serve index.html
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    res.sendFile(filePath);
});

// Handle client-side routing (SPA support)
app.get('*', (req, res, next) => {
    // Skip API routes and static files
    if (req.url.startsWith('/api/') || req.url.startsWith('/health') || path.extname(req.url)) {
        return next();
    }
    
    // Serve index.html for client-side routing
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Global 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
    console.log('🌙 LunaSphere production server running on port', PORT);
    console.log('🚀 Environment:', process.env.NODE_ENV || 'production');
    if (process.env.NODE_ENV !== 'production') {
        console.log('🔗 Local: http://localhost:' + PORT);
    }
    console.log('👤 Admin user configured');
    console.log('🔒 Security features enabled');
    console.log('📊 Analytics tracking active');
});

module.exports = app;