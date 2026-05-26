# QUICK DEPLOYMENT STEPS

## 1. Local Testing (Optional but Recommended)

Before deploying to Vercel, test locally:

```bash
# Install dependencies (if not already done)
npm install

# Create .env file with local MongoDB
echo "MONGODB_URI=mongodb://127.0.0.1:27017/integritext" > .env
echo "JWT_SECRET=test_secret_key_12345678901234567890" >> .env
echo "NODE_ENV=development" >> .env

# Start the server
npm start

# Visit http://localhost:5000 and test signup/login
```

## 2. Push Code to GitHub

```bash
# Initialize git if not done
git init
git add .
git commit -m "Prepare for Vercel deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/your-repo-name.git
git branch -M main
git push -u origin main
```

## 3. Deploy to Vercel

### Option A: Via Dashboard

1. Visit https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Click "Deploy"

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow the prompts
```

## 4. Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add these variables:

   **For Production:**
   
   - **MONGODB_URI**
     ```
     mongodb+srv://username:password@cluster.mongodb.net/integritext?retryWrites=true&w=majority
     ```
     - Replace username, password, and cluster name
     - Get from MongoDB Atlas
   
   - **JWT_SECRET**
     ```
     your_random_secure_key_min_32_chars
     ```
   
   - **NODE_ENV**
     ```
     production
     ```

4. Redeploy from the "Deployments" tab

## 5. Test Deployment

1. Visit your Vercel URL (e.g., https://your-app.vercel.app)
2. Test Signup:
   - Click "Create one"
   - Enter name, email, password
   - Click "Create Account"
   - Should NOT show "unexpected token" error
3. Test Login:
   - Enter email and password
   - Click "Sign In"
   - Should log in successfully

## 6. Troubleshooting

### "Unexpected Token" Error

**Cause:** Usually means JSON parsing failed

**Fix:**
- [ ] Verify MONGODB_URI is correct in Vercel environment
- [ ] Verify JWT_SECRET is set in Vercel environment
- [ ] Check browser console (F12) for exact error
- [ ] Check Vercel logs: Project → Deployments → Function Logs
- [ ] Clear browser cache: Ctrl+Shift+Delete

### Cannot Connect to Database

**Cause:** MongoDB connection string or credentials are wrong

**Fix:**
- [ ] Test connection string locally first
- [ ] Verify username and password are URL-encoded if they contain special characters
- [ ] Add Vercel IP to MongoDB Atlas whitelist: 0.0.0.0/0 (or specific IPs)
- [ ] Check MongoDB Atlas cluster is running

### 502 Bad Gateway

**Cause:** Backend error

**Fix:**
- [ ] Check Vercel function logs for errors
- [ ] Verify environment variables are set
- [ ] Check MongoDB connection
- [ ] Look at "Runtime Logs" in Vercel dashboard

## Required MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a cluster (free tier M0)
3. Create a database user:
   - Username: `dbuser`
   - Password: Generate secure password
   - Copy the connection string
4. Add Vercel to IP whitelist:
   - Click "Network Access"
   - Add IP address: `0.0.0.0/0` (for testing)
   - In production, use specific IPs
5. Use connection string format:
   ```
   mongodb+srv://dbuser:PASSWORD@cluster0.xxxxx.mongodb.net/integritext?retryWrites=true&w=majority
   ```

## Files Modified for Vercel Deployment

✅ `api/index.js` - Updated CORS, middleware, static file serving
✅ `vercel.json` - Added proper routes and headers
✅ `public/app.js` - Fixed API URL resolution
✅ `.env.example` - Provided example environment variables

## Key Changes Made

1. **API URL Fix**: Frontend now uses relative paths (`/api/...`) instead of `window.location.origin`
2. **CORS Headers**: Configured to accept requests from Vercel domains
3. **Static Files**: Frontend now properly served by Express
4. **Error Handling**: Proper JSON error responses for all scenarios
5. **Content-Type**: All responses set to `application/json`

## After Successful Deployment

- Domain will be: `https://your-project.vercel.app`
- Custom domain available: Settings → Domains
- Analytics available: Settings → Analytics
- Environment logs: Deployments → Function Logs

## For Production

1. Use a custom domain:
   - Go to Vercel Settings → Domains
   - Add your domain (e.g., integritext.com)
   - Follow DNS setup instructions

2. Enable auto-deploys:
   - Settings → Git
   - Deploy on every push to main

3. Monitor performance:
   - Analytics tab shows request metrics
   - Function logs show errors

4. Scale as needed:
   - MongoDB Atlas can auto-scale storage
   - Vercel automatically scales functions
   - No manual infrastructure management needed
