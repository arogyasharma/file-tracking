# Deployment Guide for File Tracking System

## Why GitHub Pages Won't Work

GitHub Pages only hosts **static websites** (HTML, CSS, JS files). Your file tracking system is a **dynamic Node.js application** that requires:
- Node.js server runtime
- MongoDB database connection
- Server-side processing
- Real-time data operations

## Recommended Deployment Options

### 1. Heroku (Easiest - Free Tier Available)

#### Prerequisites
- Heroku account (free): https://signup.heroku.com/
- Heroku CLI installed: https://devcenter.heroku.com/articles/heroku-cli

#### Steps to Deploy on Heroku

1. **Install Heroku CLI**
   ```bash
   # Download from: https://devcenter.heroku.com/articles/heroku-cli
   # Or use npm:
   npm install -g heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   cd "d:/internship/file tracking (vs code)"
   heroku create your-file-tracking-app
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your_mongodb_atlas_connection_string
   ```

5. **Deploy to Heroku**
   ```bash
   git add .
   git commit -m "Prepare for Heroku deployment"
   git push heroku master
   ```

6. **Open Your App**
   ```bash
   heroku open
   ```

#### Heroku Configuration Files
- `Procfile` - Tells Heroku how to start your app
- `package.json` - Already configured with start script

### 2. Railway (Modern Alternative)

#### Steps for Railway
1. Visit https://railway.app/
2. Sign up with GitHub
3. Click "Deploy from GitHub repo"
4. Select your file-tracking repository
5. Add environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `PORT`: 3000
6. Deploy automatically

### 3. Render (Free Tier Available)

#### Steps for Render
1. Visit https://render.com/
2. Sign up with GitHub
3. Click "New Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add `MONGODB_URI`
6. Deploy

### 4. Vercel (For Node.js Apps)

#### Steps for Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
4. Add environment variables in Vercel dashboard

### 5. DigitalOcean App Platform

#### Steps for DigitalOcean
1. Create DigitalOcean account
2. Go to App Platform
3. Connect GitHub repository
4. Configure build settings
5. Add environment variables
6. Deploy

## Environment Variables Needed

For any deployment platform, you'll need:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
PORT=3000
```

## Pre-Deployment Checklist

### 1. Update server.js for Production
```javascript
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'your-local-mongodb-uri';
```

### 2. Create Production MongoDB Database
- Use MongoDB Atlas (free tier available)
- Get connection string
- Add to environment variables

### 3. Test Locally with Production Settings
```bash
export NODE_ENV=production
export MONGODB_URI=your_production_mongodb_uri
npm start
```

## Recommended: Heroku Deployment (Step by Step)

### Step 1: Prepare Your App
```bash
cd "d:/internship/file tracking (vs code)"
```

### Step 2: Install Heroku CLI
Download from: https://devcenter.heroku.com/articles/heroku-cli

### Step 3: Login and Create App
```bash
heroku login
heroku create file-tracking-system-2024
```

### Step 4: Set Environment Variables
```bash
heroku config:set MONGODB_URI="mongodb+srv://arogyasharma10:rsgd3rM5tON7mLvP@cluster1.7md2bxs.mongodb.net/fileTracker?retryWrites=true&w=majority&appName=Cluster1"
```

### Step 5: Deploy
```bash
git add .
git commit -m "Add Heroku deployment configuration"
git push heroku master
```

### Step 6: Open Your Live App
```bash
heroku open
```

## Alternative: Local Network Deployment

If you want to make it accessible on your local network:

### Using ngrok (Temporary Public URL)
```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm start

# In another terminal, expose port 3000
ngrok http 3000
```

This gives you a temporary public URL like: `https://abc123.ngrok.io`

## Static Version for GitHub Pages (Limited Functionality)

If you absolutely need GitHub Pages, you could create a **static demo version**:
- Remove server-side functionality
- Use localStorage for data
- No real database
- Limited to single-user, single-session

But this would lose most of the app's functionality.

## Conclusion

**Recommended Approach**: Deploy on **Heroku** for the full-featured application with database connectivity and all features working.

GitHub Pages is not suitable for Node.js applications with databases.