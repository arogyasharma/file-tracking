const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://arogyasharma10:rsgd3rM5tON7mLvP@cluster1.7md2bxs.mongodb.net/fileTracker?retryWrites=true&w=majority&appName=Cluster1';

// Configure mongoose for serverless
mongoose.set('bufferCommands', false);
mongoose.set('bufferMaxEntries', 0);

let isConnected = false;

async function connectToDatabase() {
    if (isConnected) {
        return;
    }
    
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

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.set('layout', 'layout');

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

// Settings Schema
const settingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
    description: String
});

const Settings = mongoose.model('Settings', settingsSchema);

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

// Routes
app.get('/', (req, res) => {
    res.render('index');
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

// Create a new file
app.post('/files', async (req, res) => {
    try {
        await connectToDatabase();
        
        if (!req.body.fileNumber || !req.body.fileName) {
            return res.status(400).send('Error: File Number and File Name are required');
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
        
        const qrUrl = `${req.protocol}://${req.get('host')}/file/${fileId}`;
        const qrImage = await QRCode.toDataURL(qrUrl);
        
        res.render('qrcode', { 
            fileId, 
            fileName: newFile.fileName, 
            fileNumber: newFile.fileNumber,
            serialNumber: newFile.serialNumber,
            qrImage 
        });
    } catch (error) {
        console.error('Error creating file:', error);
        
        if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.fileNumber) {
                res.status(400).send('Error: File number already exists. Please use a different file number.');
            } else {
                res.status(400).send('Error: File with this information already exists.');
            }
        } else {
            res.status(500).send(`Error creating file: ${error.message}`);
        }
    }
});

// Get all files
app.get('/files', async (req, res) => {
    try {
        await connectToDatabase();
        const files = await File.find().sort({ createdAt: -1 });
        res.render('files', { files });
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).send(`Error fetching files: ${error.message}`);
    }
});

// Get file by ID
app.get('/file/:fileId', async (req, res) => {
    try {
        await connectToDatabase();
        const file = await File.findOne({ fileId: req.params.fileId });
        if (!file) {
            return res.status(404).render('error', { message: 'File not found' });
        }
        
        const settings = await Settings.findOne({ key: 'allowQRStatusChange' });
        const allowQRStatusChange = settings ? settings.value : true;
        
        res.render('file-detail', { file, allowQRStatusChange });
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).render('error', { message: 'Error fetching file details' });
    }
});

// Update file status
app.post('/file/:fileId/update', async (req, res) => {
    try {
        await connectToDatabase();
        const file = await File.findOne({ fileId: req.params.fileId });
        if (!file) {
            return res.status(404).send('File not found');
        }

        const oldStatus = file.status;
        const oldLocation = file.currentLocation;
        
        file.status = req.body.status || file.status;
        file.currentLocation = req.body.currentLocation || file.currentLocation;
        
        if (req.body.status !== oldStatus || req.body.currentLocation !== oldLocation) {
            file.history.push({
                location: file.currentLocation,
                status: file.status,
                handler: req.body.handler || 'Unknown',
                notes: req.body.notes || 'Status updated',
                timestamp: new Date()
            });
        }

        await file.save();
        res.redirect(`/file/${file.fileId}`);
    } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).send('Error updating file');
    }
});

// Search files
app.get('/search', async (req, res) => {
    try {
        await connectToDatabase();
        const query = req.query.q;
        if (!query) {
            return res.render('search', { files: [], query: '' });
        }

        const files = await File.find({
            $or: [
                { fileNumber: { $regex: query, $options: 'i' } },
                { fileName: { $regex: query, $options: 'i' } },
                { serialNumber: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { department: { $regex: query, $options: 'i' } },
                { owner: { $regex: query, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });

        res.render('search', { files, query });
    } catch (error) {
        console.error('Error searching files:', error);
        res.status(500).send('Error searching files');
    }
});

module.exports = app;