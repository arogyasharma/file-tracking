const express = require('express');
const mongoose = require('mongoose');
const QRCode = require('qrcode');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://arogyasharma10:rsgd3rM5tON7mLvP@cluster1.7md2bxs.mongodb.net/fileTracker?retryWrites=true&w=majority&appName=Cluster1';

let isConnected = false;

async function connectToDatabase() {
    if (isConnected) return;
    
    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        isConnected = true;
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// File Schema
const fileSchema = new mongoose.Schema({
    fileId: { type: String, required: true, unique: true },
    fileNumber: { type: String, required: true },
    serialNumber: { type: String, required: true, unique: true },
    fileName: { type: String, required: true },
    description: String,
    department: String,
    owner: String,
    currentLocation: String,
    status: {
        type: String,
        enum: ['Active', 'Archived', 'In Review', 'Pending', 'Completed'],
        default: 'Active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    history: [{
        location: String,
        status: String,
        handler: String,
        notes: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

const File = mongoose.model('File', fileSchema);

// Generate serial number
async function generateSerialNumber() {
    const currentYear = new Date().getFullYear();
    const prefix = `SN${currentYear}`;
    
    try {
        const lastFile = await File.findOne({
            serialNumber: { $regex: `^${prefix}` }
        }).sort({ serialNumber: -1 });
        
        let nextNumber = 1;
        if (lastFile && lastFile.serialNumber) {
            const lastNumber = parseInt(lastFile.serialNumber.replace(prefix, ''));
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        
        const formattedNumber = nextNumber.toString().padStart(6, '0');
        return `${prefix}${formattedNumber}`;
    } catch (error) {
        console.error('Error generating serial number:', error);
        return `SN${currentYear}${Date.now().toString().slice(-6)}`;
    }
}

// Routes - JSON API only (no views)
app.get('/', (req, res) => {
    res.json({
        message: 'File Tracking System API',
        endpoints: {
            'GET /health': 'Check system health',
            'POST /api/files': 'Create a new file',
            'GET /api/files': 'Get all files',
            'GET /api/files/:fileId': 'Get file by ID'
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/health', async (req, res) => {
    try {
        await connectToDatabase();
        res.json({ 
            status: 'ok', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            database: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Create a new file (JSON response)
app.post('/api/files', async (req, res) => {
    try {
        await connectToDatabase();
        
        if (!req.body.fileNumber || !req.body.fileName) {
            return res.status(400).json({
                success: false,
                error: 'File Number and File Name are required'
            });
        }
        
        const fileId = 'FILE-' + Date.now();
        const serialNumber = await generateSerialNumber();
        
        const newFile = new File({
            fileId,
            fileNumber: req.body.fileNumber,
            serialNumber: serialNumber,
            fileName: req.body.fileName,
            description: req.body.description || '',
            department: req.body.department || '',
            owner: req.body.owner || '',
            currentLocation: req.body.currentLocation || '',
            status: req.body.status || 'Active',
            history: [{
                location: req.body.currentLocation || '',
                status: req.body.status || 'Active',
                handler: req.body.owner || '',
                notes: 'File created',
                timestamp: new Date()
            }]
        });

        await newFile.save();
        
        // Generate QR code
        const qrUrl = `${req.protocol}://${req.get('host')}/api/files/${fileId}`;
        const qrImage = await QRCode.toDataURL(qrUrl);
        
        res.json({
            success: true,
            message: 'File created successfully',
            file: {
                fileId: newFile.fileId,
                fileNumber: newFile.fileNumber,
                serialNumber: newFile.serialNumber,
                fileName: newFile.fileName,
                qrCode: qrImage,
                qrUrl: qrUrl
            }
        });
        
    } catch (error) {
        console.error('Error creating file:', error);
        
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                error: 'File number already exists. Please use a different file number.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: `Error creating file: ${error.message}`
            });
        }
    }
});

// Get all files
app.get('/api/files', async (req, res) => {
    try {
        await connectToDatabase();
        const files = await File.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: files.length,
            files: files
        });
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({
            success: false,
            error: `Error fetching files: ${error.message}`
        });
    }
});

// Get file by ID
app.get('/api/files/:fileId', async (req, res) => {
    try {
        await connectToDatabase();
        const file = await File.findOne({ fileId: req.params.fileId });
        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        
        res.json({
            success: true,
            file: file
        });
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching file details'
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
    });
});

module.exports = app;