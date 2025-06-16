const express = require('express');

const app = express();

// Minimal middleware
app.use(express.json());

// Simple route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Express app works in serverless!',
        timestamp: new Date().toISOString()
    });
});

app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Test route works!',
        url: req.url,
        method: req.method
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    res.status(500).json({
        success: false,
        error: error.message
    });
});

module.exports = app;