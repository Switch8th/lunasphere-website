const express = require('express');
const logger = require('../utils/logger');

const router = express.Router();

// API info endpoint
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'LunaSphere API v1.0',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            contact: '/api/contact',
            health: '/health',
        }
    });
});

// API version endpoint
router.get('/version', (req, res) => {
    const packageJson = require('../../package.json');
    
    res.json({
        success: true,
        data: {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            node: process.version,
            environment: process.env.NODE_ENV || 'development'
        }
    });
});

module.exports = router;