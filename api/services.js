const path = require('path');
const fs = require('fs').promises;

// Define the correct path to services.json, relative to the project root
const servicesFilePath = path.join(process.cwd(), 'data', 'services.json');

module.exports = async (req, res) => {
    try {
        const data = await fs.readFile(servicesFilePath, 'utf-8');
        const services = JSON.parse(data);
        
        // Vercel handles caching headers automatically, but we can set them for other environments
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ message: 'Error fetching services data' });
    }
};