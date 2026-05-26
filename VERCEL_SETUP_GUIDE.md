# Vercel Deployment Guide for Plagiarism Checker

## Step 1: Prepare Your GitHub Repository

1. Initialize Git in your project (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub (https://github.com/new)

3. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/plagiarism-checker.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Create Vercel Project

1. Go to https://vercel.com and sign in with your GitHub account
2. Click "New Project"
3. Import your GitHub repository
4. Select the project root folder
5. Click "Deploy"

## Step 3: Set Environment Variables in Vercel

1. After the initial deploy fails, go to your project settings
2. Click "Environment Variables" in the left sidebar
3. Add the following variables:

   **MONGODB_URI** (Production):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/integritext?retryWrites=true&w=majority
   ```
   - Get this from your MongoDB Atlas connection string
   - Add this to "Production" environment

   **JWT_SECRET** (Production):
   ```
   your_jwt_secret_key_here_min_32_characters_recommended
   ```
   - Add this to "Production" environment

   **NODE_ENV**:
   ```
   production
   ```

4. Click "Save" and trigger a redeploy

## Step 4: Configure MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a cluster (free tier available)
3. Create a database user with a strong password
4. Add your Vercel deployment IP to the whitelist (0.0.0.0/0 for testing, then restrict)
5. Get your connection string and add it to Vercel environment variables

## Step 5: Test Your Deployment

### Local Testing First:
```bash
npm install
npm start
```
- Navigate to http://localhost:5000
- Test signup with a new account
- Test login
- Test plagiarism checker

### After Vercel Deployment:
1. Visit your Vercel deployment URL (e.g., https://your-project.vercel.app)
2. Test signup with email and password
3. Test login
4. Verify no "unexpected token" errors appear

## Common Issues and Fixes

### Issue: "Unexpected Token" Error on Signup/Login

**Causes:**
- Incorrect API URL configuration
- CORS issues
- MongoDB connection problems
- Invalid JSON responses

**Solutions:**
- Verify MongoDB URI is correct in environment variables
- Check browser console for exact error message
- Verify JWT_SECRET is set
- Clear browser cache and localStorage

### Issue: 502 Bad Gateway

**Causes:**
- MongoDB connection timeout
- Environment variables not set
- API route not matching

**Solutions:**
- Verify MONGODB_URI is correct
- Check Vercel function logs: Project Settings > Functions
- Ensure all required environment variables are set

### Issue: Frontend Files Not Loading

**Causes:**
- Static file serving not configured
- Incorrect public folder path

**Solutions:**
- Verify vercel.json has correct routes
- Check that public folder exists with index.html
- Verify all static assets are properly linked

## Deployment Checklist

- [ ] GitHub repository created and code pushed
- [ ] Vercel project connected to GitHub
- [ ] MONGODB_URI environment variable set
- [ ] JWT_SECRET environment variable set  
- [ ] NODE_ENV set to production
- [ ] MongoDB Atlas cluster created and configured
- [ ] IP whitelist configured in MongoDB Atlas
- [ ] Signup/login tested locally
- [ ] Plagiarism checker tested locally
- [ ] Vercel deployment succeeds
- [ ] Frontend loads at Vercel URL
- [ ] Signup works without "unexpected token" error
- [ ] Login works without "unexpected token" error
- [ ] All features functional on deployed site

## Troubleshooting with Vercel Logs

To view detailed error logs:

1. Go to your Vercel project dashboard
2. Click the "Deployments" tab
3. Click on the latest deployment
4. View the build logs and function logs
5. Check browser console (F12) for frontend errors

## MongoDB Connection String Format

For MongoDB Atlas:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/integritext?retryWrites=true&w=majority
```

Replace:
- `username`: Your database user
- `password`: Your database user's password (URL encoded if special characters)
- `cluster0`: Your cluster name
- `xxxxx`: Your connection string identifier

## API Endpoints Available

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login to account
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/update` - Update user profile
- `POST /api/scans/plagiarism` - Check plagiarism
- `POST /api/scans/ai-detect` - Detect AI content
- `POST /api/scans/grammar` - Check grammar
- `POST /api/scans/humanizer` - Humanize AI text
- `POST /api/chat` - Chat with AI assistant

All API routes (except `/api/contact`) require JWT token in Authorization header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

## Local Development

To run locally before deploying:

```bash
# Install dependencies
npm install

# Create .env file with:
# MONGODB_URI=mongodb://127.0.0.1:27017/integritext
# JWT_SECRET=your_secret_key

# Start the server
npm start

# Visit http://localhost:5000
```

## Support

If you encounter issues:
1. Check Vercel function logs
2. Verify all environment variables are set correctly
3. Test MongoDB connection separately
4. Check browser console for client-side errors
5. Review the backend logs in Vercel dashboard
