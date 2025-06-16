# Quick Setup Guide

## For New Users Cloning This Repository

### 1. Clone the Repository
```bash
git clone https://github.com/arogyasharma/file-tracking.git
cd file-tracking
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Database
- Open `server.js`
- Update the MongoDB connection string on line 11:
```javascript
mongoose.connect('YOUR_MONGODB_CONNECTION_STRING')
```

### 4. Start the Application
```bash
npm start
```

### 5. Access the Application
- Open your browser
- Navigate to `http://localhost:3000`

## For Development

### Making Changes
1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes

3. Commit changes:
```bash
git add .
git commit -m "Description of your changes"
```

4. Push to GitHub:
```bash
git push origin feature/your-feature-name
```

5. Create a Pull Request on GitHub

### Updating from Remote
```bash
git pull origin master
```

## Environment Variables (Optional)
Create a `.env` file for production:
```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
```

## Features Available
- ✅ File creation with file numbers
- ✅ Automatic serial number generation
- ✅ QR code generation and scanning
- ✅ File status and location tracking
- ✅ Complete audit history
- ✅ Configurable QR status change permissions
- ✅ Multi-criteria search functionality
- ✅ Print-friendly QR codes

## Default Settings
- QR Status Change: **Enabled** (users can update status via QR scanning)
- Serial Number Format: `SN{YEAR}{6-digits}`
- Database: MongoDB with automatic cleanup of old records

## Support
- Check the README.md for detailed documentation
- Review the guide files for specific features
- Create issues on GitHub for bugs or feature requests