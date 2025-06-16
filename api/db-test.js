const mongoose = require('mongoose');

module.exports = async (req, res) => {
    try {
        console.log('DB test function called');
        
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://arogyasharma10:rsgd3rM5tON7mLvP@cluster1.7md2bxs.mongodb.net/fileTracker?retryWrites=true&w=majority&appName=Cluster1';
        
        console.log('Attempting to connect to MongoDB...');
        
        // Simple connection test
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000,
            });
        }
        
        console.log('MongoDB connected successfully');
        
        res.status(200).json({
            success: true,
            message: 'Database connection successful!',
            connectionState: mongoose.connection.readyState,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
};