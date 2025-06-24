# File Tracking System

A comprehensive web-based file tracking system with QR code generation and scanning capabilities. Track physical files, manage their status, location, and maintain complete audit trails.

## Features

### Core Functionality
- **File Management**: Create, view, and manage file records
- **QR Code Generation**: Automatic QR code generation for each file
- **Status Tracking**: Track file status (Active, Pending, In Review, Archived, Completed)
- **Location Tracking**: Monitor current file location and movement history
- **Search Functionality**: Search by File ID, File Number, or Serial Number
- **Complete History**: Maintain detailed audit trail of all file changes

### New Features
- **File Number System**: User-defined file numbering for organizational compatibility
- **Serial Number Generation**: Automatic unique serial number generation (SN{YEAR}{6-digits})
- **QR Status Control**: Configurable setting to allow/disable status updates via QR scanning
- **Enhanced Search**: Multi-criteria search capabilities
- **Print-Friendly QR Codes**: Optimized QR code display for physical file attachment

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: EJS templating engine
- **Styling**: Bootstrap 4
- **QR Code**: QRCode.js library
- **Icons**: Font Awesome

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB installation
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/arogyasharma/file-tracking.git
   cd file-tracking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Database**
   - Update the MongoDB connection string in `server.js`
   - Replace with your MongoDB Atlas connection string or local MongoDB URL

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### Creating Files
1. Navigate to the home page
2. Fill out the file creation form:
   - **File Number**: Your organization's file reference (e.g., DOC-2024-001)
   - **File Name**: Descriptive name for the file
   - **Department**: Responsible department
   - **Owner/Handler**: Current person responsible
   - **Current Location**: Physical location of the file
   - **Status**: Current status of the file
3. Click "Create File & Generate QR Code"
4. Print the generated QR code and attach to physical file

### Tracking Files
- **Search**: Use the search bar to find files by ID, File Number, or Serial Number
- **QR Scanning**: Scan QR codes to directly access file details
- **File List**: View all files in the system with sorting and filtering options

### Updating File Status
- Scan QR code or navigate to file details
- Update status, location, handler, and add notes
- All changes are automatically recorded in the file history

### System Settings
- Access via Settings link in navigation
- Configure QR status change permissions
- Control whether QR scanners can update file status

## File Identification System

### Three Types of Identifiers
1. **System File ID**: Auto-generated (FILE-timestamp)
2. **File Number**: User-provided organizational reference
3. **Serial Number**: Auto-generated unique identifier (SN{YEAR}{6-digits})

### Serial Number Format
- `SN2024000001` - First file of 2024
- `SN2024000002` - Second file of 2024
- `SN2025000001` - First file of 2025 (resets yearly)

## API Endpoints

### File Management
- `GET /` - Home page with file creation form
- `POST /files` - Create new file
- `GET /files` - List all files
- `GET /file/:fileId` - View file details
- `POST /file/:fileId/update` - Update file status

### Search and Navigation
- `GET /search` - Search files by various criteria

### Settings Management
- `GET /settings` - View system settings
- `POST /settings/update` - Update system settings

## Database Schema

### File Schema
```javascript
{
  fileId: String,           // System-generated unique ID
  fileNumber: String,       // User-provided file number
  serialNumber: String,     // System-generated serial number
  fileName: String,         // File name
  description: String,      // File description
  department: String,       // Responsible department
  owner: String,           // Current owner/handler
  currentLocation: String, // Current physical location
  status: String,          // Current status
  createdAt: Date,         // Creation timestamp
  history: [{              // Change history
    location: String,
    status: String,
    handler: String,
    timestamp: Date,
    notes: String
  }]
}
```

### Settings Schema
```javascript
{
  key: String,             // Setting identifier
  value: Mixed,            // Setting value
  description: String,     // Setting description
  updatedAt: Date         // Last update timestamp
}
```

## Configuration

### Environment Variables
Create a `.env` file for production deployment:
```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
```

### QR Status Control Setting
- **Key**: `allowQRStatusChange`
- **Values**: `true` (allow updates) / `false` (view only)
- **Default**: `true`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request



## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team

## Changelog

### Version 2.0.0
- Added File Number and Serial Number system
- Enhanced QR code display with multiple identifiers
- Improved search functionality with multi-criteria support
- Added configurable QR status change permissions
- Enhanced print-friendly QR code layout

### Version 1.0.0
- Initial release with basic file tracking
- QR code generation and scanning
- Status and location tracking
- File history management

## Screenshots

### File Creation
![File Creation Form](screenshots/file-creation.png)

### QR Code Generation
![QR Code Display](screenshots/qr-code.png)

### File Details
![File Details View](screenshots/file-details.png)

### Settings Management
![Settings Page](screenshots/settings.png)

---

**Built with ❤️ for efficient file management**
