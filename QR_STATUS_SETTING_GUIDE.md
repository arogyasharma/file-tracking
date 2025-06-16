# QR Code Status Change Setting Guide

## Overview
The file tracking system now includes a configurable setting that controls whether users who scan QR codes can change file status directly from the file details page.

## How It Works

### Default Behavior
- By default, the setting `allowQRStatusChange` is set to `true` (enabled)
- When enabled, users who scan QR codes can update file status, location, and add notes
- When disabled, users can only view file details but cannot make changes

### Accessing Settings
1. Navigate to the Settings page by clicking the "Settings" link in the navigation bar
2. The settings page shows all system configuration options
3. Only administrators should have access to modify these settings

### Managing the QR Status Change Setting

#### To Enable QR Status Changes:
1. Go to Settings page
2. Find the "allowQRStatusChange" setting
3. Select "Enabled" radio button
4. Click "Update" button
5. Users scanning QR codes will now see the status update form

#### To Disable QR Status Changes:
1. Go to Settings page
2. Find the "allowQRStatusChange" setting
3. Select "Disabled" radio button
4. Click "Update" button
5. Users scanning QR codes will see a message that status updates are disabled

### User Experience

#### When Enabled:
- QR code scanners see the full file details page with an "Update File Status" form
- They can change status, location, handler, and add notes
- Changes are recorded in the file history

#### When Disabled:
- QR code scanners see the file details but no update form
- Instead, they see a warning message explaining that status updates are disabled
- They are directed to contact administrators or use the main interface for updates

### Technical Details

#### Database Schema:
```javascript
// Settings collection stores configuration
{
  key: 'allowQRStatusChange',
  value: true/false,
  description: 'Allow users who scan QR codes to change file status',
  updatedAt: Date
}
```

#### Routes:
- `GET /settings` - View settings page
- `POST /settings/update` - Update setting values
- `GET /file/:fileId` - File details (now checks setting)
- `POST /file/:fileId/update` - Update file (now validates permission)

### Security Considerations
- The setting provides a simple on/off control for QR-based status updates
- When disabled, the update route returns a 403 Forbidden error
- Consider implementing user authentication for more granular control
- Settings page should be protected with admin authentication in production

### Use Cases

#### Enable When:
- You want field workers to update file status via QR scanning
- Quick status updates are needed for workflow efficiency
- You trust users with QR access to make appropriate changes

#### Disable When:
- Only authorized personnel should update file status
- You want to maintain strict control over file status changes
- Audit requirements demand centralized status management
- During system maintenance or data migration

## Future Enhancements
- User authentication and role-based permissions
- Granular permissions (e.g., allow location updates but not status changes)
- Audit logging for setting changes
- Time-based restrictions (e.g., disable updates outside business hours)