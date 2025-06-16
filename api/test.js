// Simple test endpoint
module.exports = (req, res) => {
    res.json({
        message: 'Vercel serverless function is working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
    });
};