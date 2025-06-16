# File Number and Serial Number Feature Guide

## Overview
The file tracking system now includes two new identification fields:
1. **File Number** - User-provided file reference number
2. **Serial Number** - System-generated unique serial number

## New Features

### 1. File Number Field
- **Purpose**: Allows users to enter their organization's file numbering system
- **Input**: User types this when creating a file
- **Examples**: `DOC-2024-001`, `REP-001`, `PROJ-2024-HR-001`, etc.
- **Required**: Yes, for all new files

### 2. Serial Number Generation
- **Purpose**: System-generated unique identifier for QR codes
- **Format**: `SN{YEAR}{6-digit-number}`
- **Examples**: `SN2024000001`, `SN2024000002`, etc.
- **Generation**: Automatic, sequential by year
- **Unique**: Each serial number is unique across the entire system

## How It Works

### File Creation Process
1. User fills out the file creation form
2. User enters their **File Number** (e.g., `DOC-2024-001`)
3. System automatically generates a **Serial Number** (e.g., `SN2024000001`)
4. QR code is generated with the serial number displayed
5. Both numbers are stored and displayed throughout the system

### Serial Number Generation Logic
```javascript
// Format: SN + Year + 6-digit sequential number
SN2024000001  // First file of 2024
SN2024000002  // Second file of 2024
SN2025000001  // First file of 2025 (resets each year)
```

### Search Capabilities
Users can now search for files using any of these identifiers:
- **System File ID** (e.g., `FILE-1234567890`)
- **File Number** (e.g., `DOC-2024-001`)
- **Serial Number** (e.g., `SN2024000001`)

## User Interface Updates

### 1. File Creation Form
- Added **File Number** field (required)
- Includes helpful placeholder text and description
- Validates that file number is provided

### 2. QR Code Display
- Shows File Number, Serial Number, and System ID in a table
- Serial Number is prominently displayed under the QR code
- Print-friendly layout for physical file attachment

### 3. File Details Page
- Displays both File Number and Serial Number prominently
- Shows in the basic information table
- Handles legacy files that might not have these fields

### 4. File Listing
- Added columns for File Number and Serial Number
- Shows "N/A" for any legacy files without these fields
- Sortable and searchable by these new fields

### 5. Search Interface
- Updated search placeholders to indicate multiple search options
- Works with File ID, File Number, or Serial Number
- Single search box handles all three types

## Database Changes

### Schema Updates
```javascript
{
  fileId: String,           // System-generated (FILE-timestamp)
  fileNumber: String,       // User-provided (required)
  serialNumber: String,     // System-generated (required, unique)
  fileName: String,
  // ... other existing fields
}
```

### Data Migration
- Old records without the new fields are automatically cleaned up on server startup
- New files require both File Number and Serial Number
- Unique constraints ensure no duplicate serial numbers

## Benefits

### For Users
1. **Familiar Numbering**: Can use existing organizational file numbering systems
2. **Easy Tracking**: Multiple ways to search and find files
3. **QR Code Efficiency**: Serial numbers are shorter and cleaner for QR codes
4. **Print-Friendly**: QR codes show relevant identification information

### For Organizations
1. **Integration**: Works with existing file numbering conventions
2. **Audit Trail**: Multiple identifiers for comprehensive tracking
3. **Scalability**: Serial numbers provide unlimited unique identifiers
4. **Flexibility**: Search by any identifier type

## Usage Examples

### Creating a File
1. Navigate to the home page
2. Fill out the form:
   - **File Number**: `HR-2024-001`
   - **File Name**: `Employee Handbook Update`
   - **Department**: `Human Resources`
   - (other fields...)
3. Click "Create File & Generate QR Code"
4. System generates Serial Number: `SN2024000001`
5. Print the QR code with both numbers displayed

### Searching for Files
- Search by File Number: `HR-2024-001`
- Search by Serial Number: `SN2024000001`
- Search by System ID: `FILE-1234567890`

### QR Code Scanning
1. Scan the QR code on a physical file
2. View file details showing all identifiers
3. Update status if permissions allow
4. All changes are tracked with complete identification

## Technical Implementation

### Serial Number Generation
- Checks existing serial numbers for the current year
- Finds the highest number and increments by 1
- Handles concurrent requests safely
- Falls back to timestamp-based generation if needed

### Error Handling
- Validates file number input
- Handles duplicate serial number conflicts
- Provides clear error messages
- Maintains data integrity

### Backward Compatibility
- Existing functionality remains unchanged
- Old files are cleaned up automatically
- New features enhance rather than replace existing ones

## Future Enhancements
- Bulk file import with custom numbering
- Serial number format customization
- Department-specific numbering schemes
- Barcode generation alongside QR codes
- Advanced search filters by number ranges