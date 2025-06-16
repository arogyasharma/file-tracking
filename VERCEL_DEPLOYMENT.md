# Deploy File Tracking System to Vercel

## Files Added/Modified for Vercel

✅ **vercel.json** - Vercel configuration
✅ **api/index.js** - Serverless function entry point
✅ **server.js** - Modified for Vercel compatibility
✅ **package.json** - Added Vercel build scripts

## Step-by-Step Vercel Deployment

### Method 1: Deploy via Vercel CLI (Recommended)

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Deploy from Your Project Directory
```bash
cd "d:/internship/file tracking (vs code)"
vercel --prod
```

#### Step 4: Set Environment Variables
During deployment, Vercel will ask for environment variables. Add:
- **MONGODB_URI**: `mongodb+srv://arogyasharma10:rsgd3rM5tON7mLvP@cluster1.7md2bxs.mongodb.net/fileTracker?retryWrites=true&w=majority&appName=Cluster1`

### Method 2: Deploy via Vercel Dashboard

#### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com/
2. Sign in with your GitHub account

#### Step 2: Import Project
1. Click "New Project"
2. Import from GitHub
3. Select your `file-tracking` repository

#### Step 3: Configure Project
1. **Framework Preset**: Other
2. **Build Command**: `npm run build`
3. **Output Directory**: Leave empty
4. **Install Command**: `npm install`

#### Step 4: Add Environment Variables
In the Environment Variables section, add:
- **Key**: `MONGODB_URI`
- **Value**: `mongodb+srv://arogyasharma10:rsgd3rM5tON7mLvP@cluster1.7md2bxs.mongodb.net/fileTracker?retryWrites=true&w=majority&appName=Cluster1`

#### Step 5: Deploy
Click "Deploy" and wait for the build to complete.

## Vercel Configuration Explained

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

### Key Changes Made

1. **Server.js Modification**:
   - Added conditional server start (only for local development)
   - Exported app for Vercel serverless functions

2. **API Directory**:
   - Created `api/index.js` as entry point for Vercel

3. **Package.json**:
   - Added Vercel-specific build scripts

## Important Notes

### Vercel Limitations
- **Serverless Functions**: Each request is handled by a serverless function
- **Cold Starts**: First request might be slower
- **Function Timeout**: 30 seconds max (configured in vercel.json)
- **File System**: Read-only (except /tmp directory)

### Database Connection
- MongoDB connection will be established on each request
- Connection pooling is handled by Mongoose
- No persistent connections between requests

## Testing Your Deployment

### After Deployment
1. **Get Your URL**: Vercel will provide a URL like `https://your-app-name.vercel.app`
2. **Test Features**:
   - Create a new file
   - Generate QR code
   - Update file status
   - Search functionality

### Common Issues & Solutions

#### Issue: "Module not found"
**Solution**: Ensure all dependencies are in `package.json`

#### Issue: "Database connection timeout"
**Solution**: Check MongoDB URI and network access settings

#### Issue: "Function timeout"
**Solution**: Optimize database queries or increase timeout in vercel.json

## Environment Variables

### Required Variables
- `MONGODB_URI`: Your MongoDB connection string
- `NODE_ENV`: Set to "production" (Vercel sets this automatically)

### Optional Variables
- `PORT`: Not needed for Vercel (handled automatically)

## Vercel Free Tier Limits

✅ **100GB Bandwidth/month**
✅ **100 Serverless Function Invocations/day**
✅ **10 Deployments/day**
✅ **Custom domains**
✅ **Automatic HTTPS**

Perfect for your file tracking system!

## Quick Deployment Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
cd "d:/internship/file tracking (vs code)"
vercel --prod

# Set environment variables (if not set during deployment)
vercel env add MONGODB_URI
```

## Post-Deployment

### Your Live App
After successful deployment, your file tracking system will be available at:
`https://your-project-name.vercel.app`

### Features Available
✅ File creation with QR codes
✅ File number and serial number system
✅ Status tracking and updates
✅ Search functionality
✅ Complete audit history
✅ Settings management

### Automatic Deployments
- Every push to your GitHub repository will trigger a new deployment
- Vercel automatically builds and deploys your changes

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test MongoDB connection
4. Review function timeout settings