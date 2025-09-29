const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Define the correct path to services.json
const servicesFilePath = path.join(__dirname, '..', '..', 'data', 'services.json');

// Route to get services data
router.get('/services', async (req, res) => {
    try {
        const data = await fs.readFile(servicesFilePath, 'utf-8');
        const services = JSON.parse(data);
        res.json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ message: 'Error fetching services data' });
    }
});

const contactRoutes = require('./contact');
router.use('/contact', contactRoutes);
module.exports = router;