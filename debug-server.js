const express = require('express');
const path = require('path');
require('dotenv').config();

// Import logger
const logger = require('./server/utils/logger');

console.log('Starting debug server...');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('Express app initialized');

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('Basic middleware added');

// Import and add health routes only
const healthRoutes = require('./server/routes/health');
app.use('/health', healthRoutes);

console.log('Health routes added');

// Main route
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    console.log('🔍 Serving HTML from:', filePath);
    res.sendFile(filePath);
});

console.log('Main route added');

// Start server
const server = app.listen(PORT, () => {
    console.log(`🌙 Debug server running on port ${PORT}`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    logger.info(`🌙 Debug LunaSphere server running on port ${PORT}`);
    logger.info(`🚀 Environment: ${NODE_ENV}`);
    logger.info(`🔗 Local: http://localhost:${PORT}`);
});

console.log('Server listen called');

module.exports = app;