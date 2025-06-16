// Simple root handler
module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
        message: 'File Tracking System - Serverless API',
        status: 'working',
        endpoints: [
            'GET /api/simple - Basic function test',
            'GET /api/db-test - Database connection test',
            'GET /api/express-test - Express app test',
            'GET /api/json-app - Full JSON API test'
        ],
        timestamp: new Date().toISOString()
    });
};