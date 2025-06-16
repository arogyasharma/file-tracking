// Ultra-simple test to identify the crash cause
module.exports = (req, res) => {
    try {
        console.log('Simple function called:', req.url);
        
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
            success: true,
            message: 'Simple function works!',
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in simple function:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};