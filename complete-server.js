const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting complete LunaSphere server...');

// In-memory data storage (in production, use a database)
let users = [
    {
        id: '1',
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10), // Default admin password
        role: 'admin',
        registeredAt: new Date().toISOString(),
        assignedBy: 'system'
    }
];

let analytics = {
    totalVisitors: 42,
    pageViews: 156,
    registeredUsers: 1,
    onlineNow: 3
};

let visitors = [];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// CORS headers for API
app.use('/api', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

// ===== API ROUTES =====

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt for username:', username);
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username and password are required'
        });
    }
    
    const user = users.find(u => u.username === username);
    if (!user) {
        console.log('❌ User not found:', username);
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

// Get all users
app.get('/api/users', (req, res) => {
    console.log('👥 Fetching all users');
    
    // Return users without passwords
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    
    res.json(usersWithoutPasswords);
});

// Create new user (signup)
app.post('/api/users', (req, res) => {
    const { username, password, role = 'user' } = req.body;
    
    console.log('📝 Creating new user:', username);
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username and password are required'
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
    
    // Create new user
    const newUser = {
        id: uuidv4(),
        username,
        password: bcrypt.hashSync(password, 10),
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

// Update user role
app.put('/api/users/:username/role', (req, res) => {
    const { username } = req.params;
    const { role, assignedBy } = req.body;
    
    console.log('🔄 Updating role for user:', username, 'to:', role);
    
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
    console.log('📊 Fetching analytics');
    
    // Update analytics
    analytics.registeredUsers = users.length;
    analytics.onlineNow = Math.floor(Math.random() * 10) + 1; // Simulate online users
    
    res.json(analytics);
});

// Update analytics
app.post('/api/analytics', (req, res) => {
    const { pageViews, totalVisitors } = req.body;
    
    if (pageViews !== undefined) analytics.pageViews = pageViews;
    if (totalVisitors !== undefined) analytics.totalVisitors = totalVisitors;
    
    res.json({
        success: true,
        analytics
    });
});

// Get visitors
app.get('/api/visitors', (req, res) => {
    console.log('👁️ Fetching visitors');
    
    // Add some sample visitors if none exist
    if (visitors.length === 0) {
        visitors = [
            {
                id: 'visitor_' + Date.now(),
                ip: '192.168.1.1',
                location: 'Local Network',
                timestamp: new Date().toISOString(),
                lastActivity: Date.now()
            },
            {
                id: 'visitor_' + (Date.now() - 60000),
                ip: '10.0.0.1',
                location: 'Private Network',
                timestamp: new Date(Date.now() - 60000).toISOString(),
                lastActivity: Date.now() - 60000
            }
        ];
    }
    
    res.json(visitors);
});

// Add visitor
app.post('/api/visitors', (req, res) => {
    const visitor = {
        id: 'visitor_' + Date.now(),
        ip: req.ip || '127.0.0.1',
        location: req.body.location || 'Unknown',
        timestamp: new Date().toISOString(),
        lastActivity: Date.now()
    };
    
    visitors.push(visitor);
    analytics.totalVisitors = visitors.length;
    
    res.json({
        success: true,
        visitor
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
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

// Contact form (placeholder)
app.post('/api/contact', (req, res) => {
    console.log('📧 Contact form submission:', req.body);
    
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
    console.log('🔍 Serving HTML from:', filePath);
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
    console.log('🌙 LunaSphere complete server running on port', PORT);
    console.log('🚀 Environment: development');
    console.log('🔗 Local: http://localhost:' + PORT);
    console.log('👤 Default admin login: admin / admin123');
    console.log('📊 Available API endpoints:');
    console.log('   POST /api/login - User authentication');
    console.log('   GET /api/users - Get all users');
    console.log('   POST /api/users - Create new user');
    console.log('   PUT /api/users/:username/role - Update user role');
    console.log('   GET /api/analytics - Get analytics data');
    console.log('   GET /api/visitors - Get visitors data');
    console.log('   GET /health - Health check');
});

module.exports = app;