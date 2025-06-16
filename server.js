const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');
const expressLayouts = require('express-ejs-layouts');
const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://arogyasharma10:rsgd3rM5tON7mLvP@cluster1.7md2bxs.mongodb.net/fileTracker?retryWrites=true&w=majority&appName=Cluster1').then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// File Schema
const fileSchema = new mongoose.Schema({
    fileId: { type: String, required: true, unique: true },
    fileNumber: { type: String, required: true }, // User-provided file number
    serialNumber: { type: String, required: true, unique: true }, // System-generated serial number
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
        timestamp: {
            type: Date,
            default: Date.now
        },
        notes: String
    }]
});

const File = mongoose.model('File', fileSchema);

// Settings Schema
const settingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: String,
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Settings = mongoose.model('Settings', settingsSchema);

// Initialize default settings
async function initializeSettings() {
    try {
        const existingSetting = await Settings.findOne({ key: 'allowQRStatusChange' });
        if (!existingSetting) {
            await Settings.create({
                key: 'allowQRStatusChange',
                value: true,
                description: 'Allow users who scan QR codes to change file status'
            });
            console.log('Default settings initialized');
        }
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
}

// Initialize settings on startup
initializeSettings();

// Function to clean up old records without required fields
async function cleanupOldRecords() {
    try {
        // Delete files that don't have fileNumber or serialNumber
        const result = await File.deleteMany({
            $or: [
                { fileNumber: { $exists: false } },
                { serialNumber: { $exists: false } },
                { fileNumber: null },
                { serialNumber: null }
            ]
        });
        
        if (result.deletedCount > 0) {
            console.log(`Cleaned up ${result.deletedCount} old file records without required fields`);
        }
    } catch (error) {
        console.error('Error cleaning up old records:', error);
    }
}

// Clean up old records on startup
cleanupOldRecords();

// Function to generate serial number
async function generateSerialNumber() {
    const currentYear = new Date().getFullYear();
    const prefix = `SN${currentYear}`;
    
    try {
        // Find the highest serial number for the current year
        const lastFile = await File.findOne({
            serialNumber: { $regex: `^${prefix}` }
        }).sort({ serialNumber: -1 });
        
        let nextNumber = 1;
        if (lastFile && lastFile.serialNumber) {
            const lastNumber = parseInt(lastFile.serialNumber.replace(prefix, ''));
            nextNumber = lastNumber + 1;
        }
        
        // Format with leading zeros (6 digits)
        const formattedNumber = nextNumber.toString().padStart(6, '0');
        return `${prefix}${formattedNumber}`;
    } catch (error) {
        console.error('Error generating serial number:', error);
        // Fallback to timestamp-based serial number
        return `SN${currentYear}${Date.now().toString().slice(-6)}`;
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Create a new file
app.post('/files', async (req, res) => {
    try {
        const fileId = 'FILE-' + Date.now();
        const serialNumber = await generateSerialNumber();
        
        const newFile = new File({
            fileId,
            fileNumber: req.body.fileNumber,
            serialNumber: serialNumber,
            fileName: req.body.fileName,
            description: req.body.description,
            department: req.body.department,
            owner: req.body.owner,
            currentLocation: req.body.currentLocation,
            status: req.body.status || 'Active',
            history: [{
                location: req.body.currentLocation,
                status: req.body.status || 'Active',
                handler: req.body.owner,
                notes: 'File created'
            }]
        });

        await newFile.save();
        
        // Generate QR code URL for this file
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
            // Duplicate key error
            if (error.keyPattern && error.keyPattern.serialNumber) {
                res.status(400).send('Error: Serial number generation conflict. Please try again.');
            } else {
                res.status(400).send('Error: File with this information already exists.');
            }
        } else {
            res.status(500).send('Error creating file');
        }
    }
});

// Get all files
app.get('/files', async (req, res) => {
    try {
        const files = await File.find().sort({ createdAt: -1 });
        res.render('files', { files });
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).send('Error fetching files');
    }
});

// Get file by ID (for QR code scanning)
app.get('/file/:fileId', async (req, res) => {
    try {
        const file = await File.findOne({ fileId: req.params.fileId });
        if (!file) {
            return res.status(404).render('error', { message: 'File not found' });
        }
        
        // Get the setting for QR status change permission
        const setting = await Settings.findOne({ key: 'allowQRStatusChange' });
        const allowStatusChange = setting ? setting.value : true; // Default to true if setting not found
        
        res.render('fileDetails', { file, allowStatusChange });
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).send('Error fetching file');
    }
});

// Update file status
app.post('/file/:fileId/update', async (req, res) => {
    try {
        // Check if QR status change is allowed
        const setting = await Settings.findOne({ key: 'allowQRStatusChange' });
        const allowStatusChange = setting ? setting.value : true;
        
        if (!allowStatusChange) {
            return res.status(403).render('error', { 
                message: 'Status updates via QR code scanning are currently disabled by administrator.',
                backLink: `/file/${req.params.fileId}`
            });
        }
        
        const file = await File.findOne({ fileId: req.params.fileId });
        if (!file) {
            return res.status(404).send('File not found');
        }

        // Update current status and location
        file.status = req.body.status;
        file.currentLocation = req.body.location;
        
        // Add to history
        file.history.push({
            location: req.body.location,
            status: req.body.status,
            handler: req.body.handler,
            notes: req.body.notes
        });

        await file.save();
        res.redirect(`/file/${req.params.fileId}`);
    } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).send('Error updating file');
    }
});

// Search for a file by ID, File Number, or Serial Number
app.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.fileId;
        
        if (!searchTerm) {
            return res.redirect('/');
        }
        
        // Search by fileId, fileNumber, or serialNumber
        const file = await File.findOne({
            $or: [
                { fileId: searchTerm },
                { fileNumber: searchTerm },
                { serialNumber: searchTerm }
            ]
        });
        
        if (!file) {
            return res.render('error', { 
                message: `No file found with ID, File Number, or Serial Number: ${searchTerm}`,
                backLink: '/'
            });
        }
        
        // Redirect to the file details page
        res.redirect(`/file/${file.fileId}`);
    } catch (error) {
        console.error('Error searching for file:', error);
        res.status(500).render('error', { 
            message: 'Error searching for file',
            backLink: '/'
        });
    }
});

// Settings management routes
app.get('/settings', async (req, res) => {
    try {
        const settings = await Settings.find().sort({ key: 1 });
        res.render('settings', { settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).send('Error fetching settings');
    }
});

// Update settings
app.post('/settings/update', async (req, res) => {
    try {
        const { key, value } = req.body;
        
        // Convert string values to appropriate types
        let processedValue = value;
        if (value === 'true') processedValue = true;
        else if (value === 'false') processedValue = false;
        
        await Settings.findOneAndUpdate(
            { key: key },
            { value: processedValue, updatedAt: new Date() },
            { upsert: true }
        );
        
        res.redirect('/settings');
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).send('Error updating settings');
    }
});

// Manual cleanup route (for admin use)
app.post('/admin/cleanup', async (req, res) => {
    try {
        await cleanupOldRecords();
        res.json({ success: true, message: 'Old records cleaned up successfully' });
    } catch (error) {
        console.error('Error in manual cleanup:', error);
        res.status(500).json({ success: false, message: 'Error cleaning up records' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});