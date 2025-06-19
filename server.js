const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const expressLayouts = require('express-ejs-layouts');
const compression = require('compression');
const app = express();
const port = process.env.PORT || 3000;

// Simple in-memory cache for settings
let settingsCache = new Map();
let cacheExpiry = new Map();

// Simple rate limiting for file creation (prevent duplicate submissions)
let recentSubmissions = new Map();

// Helper function to get cached settings
async function getCachedSetting(key, defaultValue = null) {
    const now = Date.now();
    const expiry = cacheExpiry.get(key);
    
    // Check if cache is valid (5 minutes)
    if (settingsCache.has(key) && expiry && now < expiry) {
        return settingsCache.get(key);
    }
    
    try {
        const setting = await Settings.findOne({ key }).maxTimeMS(2000).lean().exec();
        const value = setting ? setting.value : defaultValue;
        
        // Cache for 5 minutes
        settingsCache.set(key, value);
        cacheExpiry.set(key, now + 300000);
        
        return value;
    } catch (error) {
        console.error(`Error fetching setting ${key}:`, error);
        return defaultValue;
    }
}

// Connect to MongoDB Atlas with better connection options
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://arogyasharma10:rsgd3rM5tON7mLvP@cluster1.7md2bxs.mongodb.net/fileTracker?retryWrites=true&w=majority&appName=Cluster1';

const mongoOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000
};

// Configure mongoose for better performance
// Removed deprecated bufferCommands setting

// Database connection function for serverless
async function connectToDatabase() {
    if (mongoose.connection.readyState === 0) {
        try {
            await mongoose.connect(mongoUri, mongoOptions);
            console.log('Connected to MongoDB');
            
            // Initialize settings after connection is established
            await initializeSettings();
            
            // Clean up old records after connection is established (only in production)
            if (process.env.NODE_ENV === 'production') {
                await cleanupOldRecords();
            }
        } catch (err) {
            console.error('MongoDB connection error:', err);
            throw err;
        }
    }
}

// Initial connection attempt
connectToDatabase().catch(err => {
    console.error('Initial MongoDB connection failed:', err);
});

// Handle connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});

// Performance Middleware
app.use(compression()); // Enable gzip compression

// Security and performance headers
app.use((req, res, next) => {
    // Cache static assets for 1 hour
    if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Configure multer for handling multipart/form-data
const upload = multer();

// Body parsing middleware with limits
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// Static file serving with caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h', // Cache static files for 1 hour
    etag: true,
    lastModified: true
}));

app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// File Schema
const fileSchema = new mongoose.Schema({
    fileId: { type: String, required: true, unique: true },
    fileNumber: { type: String, required: true }, // User-provided file number - unique constraint handled in code
    serialNumber: { type: String, required: true, unique: true }, // System-generated serial number
    fileName: { type: String, required: true },
    description: String,
    section: String,
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
        section: String, // Current section for this history entry
        timestamp: {
            type: Date,
            default: Date.now
        },
        notes: String,
        fromSection: String,
        toSection: String,
        fromLocation: String,
        fromOfficialName: String
    }]
});

// Add indexes for better query performance
fileSchema.index({ status: 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ section: 1 });
fileSchema.index({ owner: 1 });
fileSchema.index({ fileNumber: 1 }); // Regular index for performance

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

// Initialize default settings and database constraints
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
        
        // Safely create unique index for fileNumber
        await createUniqueFileNumberIndex();
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
}

// Function to safely create unique index for fileNumber
async function createUniqueFileNumberIndex() {
    try {
        // Skip index creation in serverless environments to avoid timeout issues
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
            console.log('Skipping unique index creation in serverless environment');
            return;
        }
        
        // Check if unique index already exists
        const indexes = await File.collection.getIndexes();
        const hasUniqueFileNumberIndex = Object.keys(indexes).some(indexName => 
            indexes[indexName].some(field => 
                field.fileNumber && indexes[indexName].unique
            )
        );
        
        if (!hasUniqueFileNumberIndex) {
            // Remove any duplicate fileNumbers before creating unique index
            await removeDuplicateFileNumbers();
            
            // Create unique index
            await File.collection.createIndex({ fileNumber: 1 }, { unique: true });
            console.log('Unique index created for fileNumber');
        }
    } catch (error) {
        console.warn('Could not create unique index for fileNumber:', error.message);
        // Continue without unique index - validation will still work via code
    }
}

// Function to remove duplicate file numbers (keep the oldest one)
async function removeDuplicateFileNumbers() {
    try {
        // Limit the operation to avoid timeout in serverless environments
        const duplicates = await File.aggregate([
            {
                $group: {
                    _id: "$fileNumber",
                    count: { $sum: 1 },
                    docs: { $push: { id: "$_id", createdAt: "$createdAt" } }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            },
            {
                $limit: 10 // Limit to 10 duplicates at a time to avoid timeout
            }
        ]);
        
        for (const duplicate of duplicates) {
            // Sort by createdAt and keep the oldest, remove the rest
            const sortedDocs = duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            const toRemove = sortedDocs.slice(1); // Remove all except the first (oldest)
            
            for (const doc of toRemove) {
                await File.findByIdAndDelete(doc.id);
                console.log(`Removed duplicate file with fileNumber: ${duplicate._id}`);
            }
        }
        
        if (duplicates.length > 0) {
            console.log(`Processed ${duplicates.length} duplicate file number groups`);
        }
    } catch (error) {
        console.warn('Error removing duplicate file numbers:', error.message);
    }
}

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

// Function to generate serial number with retry logic
async function generateSerialNumber(retryCount = 0) {
    const currentYear = new Date().getFullYear();
    const prefix = `SN${currentYear}`;
    
    try {
        // Find the highest serial number for the current year with a lock
        const lastFile = await File.findOne({
            serialNumber: { $regex: `^${prefix}` }
        }).sort({ serialNumber: -1 }).lean();
        
        let nextNumber = 1;
        if (lastFile && lastFile.serialNumber) {
            const lastNumber = parseInt(lastFile.serialNumber.replace(prefix, ''));
            nextNumber = lastNumber + 1;
        }
        
        // Add retry count to avoid duplicates in concurrent requests
        if (retryCount > 0) {
            nextNumber += retryCount;
        }
        
        // Format with leading zeros (6 digits)
        const formattedNumber = nextNumber.toString().padStart(6, '0');
        return `${prefix}${formattedNumber}`;
    } catch (error) {
        console.error('Error generating serial number:', error);
        // Fallback to timestamp-based serial number with random component
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `SN${currentYear}${timestamp}${random}`;
    }
}

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Ensure database connection for serverless
        await connectToDatabase();
        
        // Check database connection
        const dbState = mongoose.connection.readyState;
        const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
        
        // Try a simple database operation
        await File.countDocuments().maxTimeMS(2000);
        
        res.json({
            status: 'healthy',
            database: dbStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            database: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Test endpoint
app.post('/test', (req, res) => {
    console.log('Test endpoint hit with body:', req.body);
    res.json({ 
        success: true, 
        body: req.body,
        timestamp: new Date().toISOString()
    });
});

// Create a new file
app.post('/files', upload.none(), async (req, res) => {
    try {
        // Ensure database connection for serverless
        await connectToDatabase();
        
        // Debug logging (can be removed in production)
        console.log('Creating new file:', req.body.fileName);
        
        // Validate required fields
        if (!req.body.fileNumber || !req.body.fileName || !req.body.section || !req.body.owner) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Check for duplicate file number with timeout
        const existingFile = await File.findOne({ fileNumber: req.body.fileNumber })
            .maxTimeMS(5000)
            .lean();
        if (existingFile) {
            return res.status(400).json({ 
                error: 'Duplicate file number! A file with this number already exists. Please try again with a different file number.',
                duplicateField: 'fileNumber'
            });
        }
        
        // Simple duplicate submission prevention
        const submissionKey = `${req.body.fileNumber}-${req.body.fileName}-${req.body.owner}`;
        const now = Date.now();
        const lastSubmission = recentSubmissions.get(submissionKey);
        
        if (lastSubmission && (now - lastSubmission) < 5000) { // 5 second window
            console.log('Duplicate submission detected, ignoring');
            return res.status(429).json({ error: 'Please wait before submitting again' });
        }
        
        recentSubmissions.set(submissionKey, now);
        
        // Clean up old entries (older than 1 minute)
        for (const [key, timestamp] of recentSubmissions.entries()) {
            if (now - timestamp > 60000) {
                recentSubmissions.delete(key);
            }
        }
        
        const fileId = 'FILE-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        let serialNumber;
        let retryCount = 0;
        const maxRetries = 3;
        
        // Generate unique serial number with retry logic
        do {
            serialNumber = await generateSerialNumber(retryCount);
            retryCount++;
        } while (retryCount < maxRetries);
        
        // Use section as the location since currentLocation field is removed
        const location = req.body.section || 'Not specified';
        
        const fileData = {
            fileId: fileId,
            fileNumber: req.body.fileNumber,
            serialNumber: serialNumber,
            fileName: req.body.fileName,
            description: req.body.description || '',
            section: req.body.section,
            owner: req.body.owner,
            currentLocation: location,
            status: req.body.status || 'Active',
            history: [{
                location: location,
                status: req.body.status || 'Active',
                handler: req.body.owner,
                section: req.body.section,
                notes: 'File created',
                toSection: req.body.section,
                fromSection: null,
                fromLocation: null,
                fromOfficialName: null
            }]
        };
        
        // Create file with generated data
        
        let newFile;
        let saveRetryCount = 0;
        const maxSaveRetries = 3;
        
        // Try to save with retry logic for duplicate serial numbers
        while (saveRetryCount < maxSaveRetries) {
            try {
                newFile = new File(fileData);
                await newFile.save();
                break; // Success, exit retry loop
            } catch (saveError) {
                if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.serialNumber) {
                    // Duplicate serial number, generate a new one and retry
                    saveRetryCount++;
                    console.log(`Duplicate serial number detected, retry ${saveRetryCount}/${maxSaveRetries}`);
                    
                    if (saveRetryCount >= maxSaveRetries) {
                        throw new Error('Failed to generate unique serial number after multiple attempts');
                    }
                    
                    // Generate new serial number and update fileData
                    fileData.serialNumber = await generateSerialNumber(saveRetryCount);
                    console.log('New serial number generated:', fileData.serialNumber);
                } else {
                    // Different error, don't retry
                    throw saveError;
                }
            }
        }
        
        // Generate QR code URL for this file with retry logic
        const qrUrl = `${req.protocol}://${req.get('host')}/file/${fileId}`;
        let qrImage;
        let qrRetryCount = 0;
        const maxQrRetries = 3;
        
        while (qrRetryCount < maxQrRetries) {
            try {
                qrImage = await QRCode.toDataURL(qrUrl, {
                    errorCorrectionLevel: 'M',
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                break; // Success, exit retry loop
            } catch (qrError) {
                qrRetryCount++;
                console.error(`QR code generation attempt ${qrRetryCount} failed:`, qrError);
                if (qrRetryCount >= maxQrRetries) {
                    throw new Error('Failed to generate QR code after multiple attempts');
                }
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 100 * qrRetryCount));
            }
        }
        
        res.render('qrcode', { 
            fileId, 
            fileName: newFile.fileName, 
            fileNumber: newFile.fileNumber,
            serialNumber: newFile.serialNumber,
            qrImage 
        });
    } catch (error) {
        console.error('Error creating file:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        
        if (error.code === 11000) {
            // Duplicate key error
            if (error.keyPattern && error.keyPattern.serialNumber) {
                res.status(400).json({ error: 'Serial number generation conflict. Please try again.' });
            } else if ((error.keyPattern && error.keyPattern.fileNumber) || 
                       (error.message && error.message.includes('fileNumber'))) {
                res.status(400).json({ 
                    error: 'Duplicate file number! A file with this number already exists. Please try again with a different file number.',
                    duplicateField: 'fileNumber'
                });
            } else {
                res.status(400).json({ error: 'File with this information already exists.' });
            }
        } else if (error.name === 'ValidationError') {
            res.status(400).json({ error: 'Validation error: ' + error.message });
        } else if (error.name === 'MongooseError' || error.name === 'MongoError') {
            res.status(503).json({ error: 'Database connection error. Please try again.' });
        } else {
            res.status(500).json({ error: 'Error creating file: ' + error.message });
        }
    }
});

// Get all files with pagination and better performance
app.get('/files', async (req, res) => {
    try {
        // Ensure database connection for serverless
        await connectToDatabase();
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50; // Limit to 50 files per page
        const skip = (page - 1) * limit;
        
        // Get files with pagination and only essential fields for listing
        const [files, totalCount] = await Promise.all([
            File.find()
                .select('fileId fileName fileNumber serialNumber status section owner createdAt') // Only select needed fields
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .maxTimeMS(5000) // Reduced timeout
                .lean() // Return plain JavaScript objects for better performance
                .exec(),
            File.countDocuments().maxTimeMS(3000) // Quick count for pagination
        ]);
        
        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        // Ensure files is always an array
        const safeFiles = Array.isArray(files) ? files : [];
        
        res.render('files', { 
            files: safeFiles,
            currentPage: page,
            totalPages,
            hasNextPage,
            hasPrevPage,
            totalCount
        });
    } catch (error) {
        console.error('Error fetching files:', error);
        
        // Check if it's a timeout error
        if (error.name === 'MongooseError' && error.message.includes('timeout')) {
            res.status(504).render('error', { 
                message: 'Database request timed out. Please try again in a moment.',
                backLink: '/'
            });
        } else {
            res.status(500).render('error', { 
                message: 'Error fetching files. Please try again.',
                backLink: '/'
            });
        }
    }
});

// Get file by ID (for QR code scanning) - Optimized with caching
app.get('/file/:fileId', async (req, res) => {
    try {
        // Use Promise.all to fetch file and cached settings concurrently
        const [file, allowStatusChange] = await Promise.all([
            File.findOne({ fileId: req.params.fileId })
                .maxTimeMS(3000) // Reduced timeout
                .lean()
                .exec(),
            getCachedSetting('allowQRStatusChange', true)
        ]);
            
        if (!file) {
            return res.status(404).render('error', { 
                message: 'File not found',
                backLink: '/files'
            });
        }
        
        // Set cache headers for file details (cache for 2 minutes)
        res.setHeader('Cache-Control', 'private, max-age=120');
        
        res.render('fileDetails', { file, allowStatusChange });
    } catch (error) {
        console.error('Error fetching file:', error);
        
        if (error.name === 'MongooseError' && error.message.includes('timeout')) {
            res.status(504).render('error', { 
                message: 'Database request timed out. Please try again.',
                backLink: '/files'
            });
        } else {
            res.status(500).render('error', { 
                message: 'Error fetching file details. Please try again.',
                backLink: '/files'
            });
        }
    }
});

// Update file status
app.post('/file/:fileId/update', async (req, res) => {
    try {
        // Check if QR status change is allowed using cache
        const allowStatusChange = await getCachedSetting('allowQRStatusChange', true);
        
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
        
        // Update section if provided
        if (req.body.toSection) {
            file.section = req.body.toSection;
        }
        
        // Update owner if provided
        if (req.body.handler) {
            file.owner = req.body.handler;
        }
        
        // Add to history with enhanced tracking
        file.history.push({
            location: req.body.location,
            status: req.body.status,
            handler: req.body.handler,
            notes: req.body.notes,
            section: req.body.toSection, // Current section for this entry
            fromSection: req.body.fromSection,
            toSection: req.body.toSection,
            fromLocation: req.body.fromLocation,
            fromOfficialName: req.body.fromOfficialName,
            timestamp: new Date()
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

// Global error handler middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    // Check if response was already sent
    if (res.headersSent) {
        return next(error);
    }
    
    // Handle different types of errors
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
        res.status(503).render('error', {
            message: 'Database service temporarily unavailable. Please try again in a moment.',
            backLink: '/'
        });
    } else if (error.name === 'ValidationError') {
        res.status(400).render('error', {
            message: 'Invalid data provided. Please check your input and try again.',
            backLink: req.get('Referer') || '/'
        });
    } else {
        res.status(500).render('error', {
            message: 'An unexpected error occurred. Please try again.',
            backLink: '/'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page not found',
        backLink: '/'
    });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// Export for Vercel
module.exports = app;