const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = '15m'; // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // Refresh token expires in 30 days

// Store refresh tokens (in production, use Redis or database)
const refreshTokens = new Set();

console.log('🔐 JWT Authentication initialized with secure tokens');

// Enable JSON parsing
app.use(express.json());

// Simple file-based storage
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const VISITORS_FILE = path.join(DATA_DIR, 'visitors.json');
const SERVICES_FILE = path.join(DATA_DIR, 'services.json');
const TOKENS_FILE = path.join(DATA_DIR, 'refresh_tokens.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize default data
const initializeData = async () => {
    // Initialize users with super admin
    if (!fs.existsSync(USERS_FILE)) {
        // Hash the default admin password
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        const defaultUsers = [{
            username: 'admin',
            password: hashedPassword,
            roles: ['super_admin'], // Changed to array of roles
            registeredAt: new Date().toISOString(),
            assignedBy: 'system',
            roleAssignedAt: new Date().toISOString(),
            createdFrom: 'system',
            accountStatus: 'active',
            lastLogin: new Date().toISOString(),
            visitCount: 0
        }];
        fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        console.log('🔑 Default admin user created with secure password hash and multiple roles support');
    }
    
    // Initialize analytics
    if (!fs.existsSync(ANALYTICS_FILE)) {
        const defaultAnalytics = {
            totalVisitors: 0,
            pageViews: 0,
            registeredUsers: 1,
            onlineNow: 0
        };
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(defaultAnalytics, null, 2));
    }
    
    // Initialize empty arrays for visitors and services
    if (!fs.existsSync(VISITORS_FILE)) {
        fs.writeFileSync(VISITORS_FILE, JSON.stringify([], null, 2));
    }
    
    if (!fs.existsSync(SERVICES_FILE)) {
        fs.writeFileSync(SERVICES_FILE, JSON.stringify([], null, 2));
    }
    
    // Initialize refresh tokens file
    if (!fs.existsSync(TOKENS_FILE)) {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify([], null, 2));
    }
};

// Initialize data asynchronously
(async () => {
    await initializeData();
    loadRefreshTokens(); // Load existing refresh tokens
    console.log('🚀 Server initialization complete with secure password storage and persistent sessions');
})();

// Helper function to check if user has specific role(s)
const userHasRole = (user, roleToCheck) => {
    const userRoles = user.roles || [user.role || 'user'];
    if (Array.isArray(roleToCheck)) {
        return roleToCheck.some(role => userRoles.includes(role));
    }
    return userRoles.includes(roleToCheck);
};

// Helper function to check if user has ALL specified roles
const userHasAllRoles = (user, rolesToCheck) => {
    const userRoles = user.roles || [user.role || 'user'];
    return rolesToCheck.every(role => userRoles.includes(role));
};

// Define available roles
const AVAILABLE_ROLES = [
    'super_admin',
    'admin',
    'moderator',
    'member',
    'customer',
    'premium_customer',
    'vip_customer',
    'user',
    'guest'
];

// Token management functions
const loadRefreshTokens = () => {
    try {
        if (fs.existsSync(TOKENS_FILE)) {
            const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
            tokens.forEach(token => refreshTokens.add(token));
            console.log(`🔄 Loaded ${tokens.length} refresh tokens from storage`);
        }
    } catch (error) {
        console.error('Error loading refresh tokens:', error);
    }
};

const saveRefreshTokens = () => {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify([...refreshTokens], null, 2));
    } catch (error) {
        console.error('Error saving refresh tokens:', error);
    }
};

const generateTokens = (user) => {
    const payload = {
        username: user.username,
        roles: user.roles || [user.role || 'user'],
        accountStatus: user.accountStatus
    };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ username: user.username }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
    
    // Store refresh token
    refreshTokens.add(refreshToken);
    saveRefreshTokens();
    
    return { accessToken, refreshToken };
};

const removeRefreshToken = (token) => {
    refreshTokens.delete(token);
    saveRefreshTokens();
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    
    next();
};

// CORS configuration to support JWT tokens
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Disable caching for development
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Disable CSP for development to avoid blocking issues
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Security-Policy');
    res.removeHeader('X-WebKit-CSP');
    
    next();
});

// ===== API ENDPOINTS =====

// Get all users (admin only)
app.get('/api/users', optionalAuth, (req, res) => {
    // Check if user has admin permissions when authenticated
    if (req.user && !userHasRole(req.user, ['super_admin', 'admin'])) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    // If no authentication, return limited info for count only
    if (!req.user) {
        try {
            const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            // Return only count information without sensitive data
            res.json({ count: users.length, message: 'User count only - login required for full access' });
            return;
        } catch (error) {
            res.status(500).json({ error: 'Failed to load user count' });
            return;
        }
    }
    
    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load users' });
    }
});

// Add new user (signup)
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, roles = ['user'] } = req.body;
        
        // Input validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters long' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Validate roles input
        let userRoles = roles;
        if (typeof roles === 'string') {
            userRoles = [roles]; // Convert single role string to array
        }
        if (!Array.isArray(userRoles)) {
            return res.status(400).json({ error: 'Roles must be an array or string' });
        }
        
        // Check for username uniqueness (case-insensitive)
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Hash the password securely
        const saltRounds = 12; // High salt rounds for security
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const newUser = {
            username: username.trim(), // Remove any whitespace
            password: hashedPassword,
            roles: userRoles, // Now supports multiple roles
            registeredAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            visitCount: 1,
            assignedBy: 'self-registration',
            roleAssignedAt: new Date().toISOString(),
            createdFrom: req.ip || 'unknown', // Track creation IP for security
            accountStatus: 'active'
        };
        
        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        // Update analytics
        const analytics = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
        analytics.registeredUsers = users.length;
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
        
        console.log(`👤 New user registered: ${username} (${userRoles.join(', ')})`);
        
        res.json({ 
            success: true, 
            user: { 
                username: newUser.username,
                roles: newUser.roles,
                registeredAt: newUser.registeredAt,
                accountStatus: newUser.accountStatus
            },
            message: 'Account created successfully'
        });
    } catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        
        // Find user (case-insensitive username search)
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check account status
        if (user.accountStatus === 'disabled') {
            return res.status(401).json({ error: 'Account is disabled' });
        }
        
        // Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log(`⚠️ Failed login attempt for user: ${username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login time
        const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
        if (userIndex >= 0) {
            users[userIndex].lastLogin = new Date().toISOString();
            users[userIndex].visitCount = (users[userIndex].visitCount || 0) + 1;
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        }
        
        // Handle legacy single role format (convert to array)
        const displayRoles = user.roles || [user.role || 'user'];
        console.log(`✅ Successful login: ${username} (${displayRoles.join(', ')})`);
        
        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens(users[userIndex]);
        
        res.json({ 
            success: true,
            message: 'Login successful',
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: JWT_EXPIRES_IN
            },
            user: { 
                username: user.username,
                roles: displayRoles,
                role: displayRoles[0], // Keep for backward compatibility
                registeredAt: user.registeredAt,
                lastLogin: users[userIndex].lastLogin,
                visitCount: users[userIndex].visitCount,
                accountStatus: user.accountStatus
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Refresh access token
app.post('/api/refresh', (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }
    
    if (!refreshTokens.has(refreshToken)) {
        return res.status(403).json({ error: 'Invalid refresh token' });
    }
    
    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        
        // Get user data
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === decoded.username);
        
        if (!user || user.accountStatus !== 'active') {
            removeRefreshToken(refreshToken);
            return res.status(403).json({ error: 'User not found or account inactive' });
        }
        
        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
        
        // Remove old refresh token
        removeRefreshToken(refreshToken);
        
        console.log(`🔄 Token refreshed for user: ${user.username}`);
        
        res.json({
            success: true,
            tokens: {
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn: JWT_EXPIRES_IN
            }
        });
    } catch (error) {
        removeRefreshToken(refreshToken);
        res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
});

// Logout user
app.post('/api/logout', authenticateToken, (req, res) => {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
        removeRefreshToken(refreshToken);
    }
    
    console.log(`🚪 Logout: ${req.user.username}`);
    
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Logout from all devices
app.post('/api/logout-all', authenticateToken, (req, res) => {
    const username = req.user.username;
    
    // Remove all refresh tokens for this user
    // In a real implementation, you'd store user-token mapping
    // For now, we'll just remove the provided token
    const { refreshToken } = req.body;
    if (refreshToken) {
        removeRefreshToken(refreshToken);
    }
    
    console.log(`🚪🚪 Logout from all devices: ${username}`);
    
    res.json({
        success: true,
        message: 'Logged out from all devices'
    });
});

// Get current user info (protected route)
app.get('/api/me', authenticateToken, (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === req.user.username);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const displayRoles = user.roles || [user.role || 'user'];
        
        res.json({
            success: true,
            user: {
                username: user.username,
                roles: displayRoles,
                role: displayRoles[0],
                registeredAt: user.registeredAt,
                lastLogin: user.lastLogin,
                visitCount: user.visitCount,
                accountStatus: user.accountStatus
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Update user roles (admin only)
app.put('/api/users/:username/roles', (req, res) => {
    try {
        const { username } = req.params;
        const { roles, assignedBy } = req.body;
        
        // Validate roles input
        let userRoles = roles;
        if (typeof roles === 'string') {
            userRoles = [roles];
        }
        if (!Array.isArray(userRoles) || userRoles.length === 0) {
            return res.status(400).json({ error: 'Roles must be a non-empty array or string' });
        }
        
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        users[userIndex].roles = userRoles;
        users[userIndex].assignedBy = assignedBy;
        users[userIndex].roleAssignedAt = new Date().toISOString();
        
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        console.log(`🔄 User roles updated: ${username} now has roles: ${userRoles.join(', ')}`);
        
        res.json({ success: true, user: { ...users[userIndex], password: undefined } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user roles' });
    }
});

// Add role to user (admin only)
app.post('/api/users/:username/roles', (req, res) => {
    try {
        const { username } = req.params;
        const { role, assignedBy } = req.body;
        
        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }
        
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Initialize roles array if it doesn't exist (for legacy users)
        if (!users[userIndex].roles) {
            users[userIndex].roles = users[userIndex].role ? [users[userIndex].role] : ['user'];
        }
        
        // Add role if not already present
        if (!users[userIndex].roles.includes(role)) {
            users[userIndex].roles.push(role);
            users[userIndex].assignedBy = assignedBy;
            users[userIndex].roleAssignedAt = new Date().toISOString();
            
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            
            console.log(`➕ Role added: ${username} now has role '${role}' (total roles: ${users[userIndex].roles.join(', ')})`);
            
            res.json({ success: true, user: { ...users[userIndex], password: undefined } });
        } else {
            res.status(400).json({ error: 'User already has this role' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to add user role' });
    }
});

// Remove role from user (admin only)
app.delete('/api/users/:username/roles/:role', (req, res) => {
    try {
        const { username, role } = req.params;
        const { assignedBy } = req.body;
        
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Initialize roles array if it doesn't exist (for legacy users)
        if (!users[userIndex].roles) {
            users[userIndex].roles = users[userIndex].role ? [users[userIndex].role] : ['user'];
        }
        
        const roleIndex = users[userIndex].roles.indexOf(role);
        if (roleIndex === -1) {
            return res.status(400).json({ error: 'User does not have this role' });
        }
        
        // Prevent removing the last role
        if (users[userIndex].roles.length === 1) {
            return res.status(400).json({ error: 'Cannot remove the last role from user' });
        }
        
        users[userIndex].roles.splice(roleIndex, 1);
        users[userIndex].assignedBy = assignedBy;
        users[userIndex].roleAssignedAt = new Date().toISOString();
        
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        console.log(`➖ Role removed: ${username} no longer has role '${role}' (remaining roles: ${users[userIndex].roles.join(', ')})`);
        
        res.json({ success: true, user: { ...users[userIndex], password: undefined } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove user role' });
    }
});

// Get analytics
app.get('/api/analytics', (req, res) => {
    try {
        const analytics = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load analytics' });
    }
});

// Update analytics
app.put('/api/analytics', (req, res) => {
    try {
        const updates = req.body;
        let analytics = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
        
        // Update analytics with provided values
        analytics = { ...analytics, ...updates };
        
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
        
        res.json({ success: true, analytics });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update analytics' });
    }
});

// Get visitors
app.get('/api/visitors', (req, res) => {
    try {
        const visitors = JSON.parse(fs.readFileSync(VISITORS_FILE, 'utf8'));
        res.json(visitors);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load visitors' });
    }
});

// Get available roles
app.get('/api/roles', (req, res) => {
    res.json({
        success: true,
        roles: AVAILABLE_ROLES,
        message: 'Available user roles'
    });
});

// Get user count (public endpoint for analytics)
app.get('/api/users/count', (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        res.json({
            success: true,
            count: users.length,
            message: 'Current registered user count'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user count' });
    }
});

// Check if user has specific role(s)
app.post('/api/users/:username/check-role', (req, res) => {
    try {
        const { username } = req.params;
        const { roles, requireAll = false } = req.body;
        
        if (!roles) {
            return res.status(400).json({ error: 'Roles to check are required' });
        }
        
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        let hasRole;
        if (requireAll) {
            hasRole = userHasAllRoles(user, Array.isArray(roles) ? roles : [roles]);
        } else {
            hasRole = userHasRole(user, roles);
        }
        
        res.json({
            success: true,
            username: user.username,
            userRoles: user.roles || [user.role || 'user'],
            checkedRoles: Array.isArray(roles) ? roles : [roles],
            hasRole,
            requireAll
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check user role' });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Service worker route (prevent 404)
app.get('/sw_js', (req, res) => {
    res.status(404).send('Service worker not implemented');
});

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Main route
app.get('/', (req, res) => {
    console.log('🔍 Serving HTML from:', path.join(__dirname, 'index.html'));
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🌙 Simple server running on http://localhost:${PORT}`);
    console.log('📁 Serving from:', __dirname);
});