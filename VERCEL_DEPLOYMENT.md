# Vercel Backend Deployment Guide

## Prerequisites
- Vercel account ([https://vercel.com](https://vercel.com))
- GitHub account (or GitLab/Bitbucket)
- MongoDB Atlas account ([https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)) for database

## Step-by-Step Deployment

### 1. Prepare MongoDB
- Create a MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas
- Go to "Database Access" and create a database user with password
- Go to "Network Access" and add `0.0.0.0/0` to allow connections from anywhere (Vercel)
- Copy the connection string from "Databases" → "Connect" → "Connect your application"
- Replace `<username>` and `<password>` with your database credentials
- Add database name: `integritext`

Example: `mongodb+srv://user:password@cluster.mongodb.net/integritext?retryWrites=true&w=majority`

### 2. Push Code to GitHub
```powershell
git init
git add .
git commit -m "Initial commit: Plagiarism Checker Backend"
git remote add origin https://github.com/YOUR_USERNAME/Plagarism-Checker.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Vercel
#### Option A: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select "Import Git Repository"
4. Paste your GitHub repository URL
5. Select your GitHub account and repository
6. Click "Import"

#### Option B: Via Vercel CLI
```powershell
npm install -g vercel
vercel login
vercel --prod
```

### 4. Configure Environment Variables in Vercel
1. After importing/creating the project, go to "Settings" → "Environment Variables"
2. Add the following variables:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB connection string (from step 1) |
| `JWT_SECRET` | Generate a strong random string (use https://randomkeygen.com/) |
| `NODE_ENV` | `production` |

3. Click "Save"
4. Redeploy the project after adding variables

### 5. Trigger Deployment
- Simply push to main branch: `git push origin main`
- Or redeploy from Vercel dashboard if variables changed

### 6. Test Your Backend
Your backend will be available at: `https://your-project-name.vercel.app`

Test endpoints:
```bash
# Register
POST https://your-project-name.vercel.app/api/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}

# Login
POST https://your-project-name.vercel.app/api/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}
```

## Troubleshooting

### MongoDB Connection Error
- Ensure IP address `0.0.0.0/0` is added to MongoDB Atlas Network Access
- Verify connection string includes database name
- Check credentials are correct

### 500 Server Error
- Check Vercel logs: Dashboard → Your Project → "Deployments" → "Details"
- Verify all environment variables are set correctly
- Ensure MongoDB is accessible from Vercel

### Function Timeout
- Default is 30 seconds (configured in vercel.json)
- Optimize MongoDB queries or increase timeout if needed

## Current Configuration

### vercel.json
- Functions: `/api/index.js` (serverless function)
- Memory: 1024 MB
- Max Duration: 30 seconds
- Rewrites: All `/api/*` requests routed to `/api/index.js`

### Environment Variables
All sensitive data (MongoDB URI, JWT Secret) should be added via Vercel dashboard, not hardcoded.

## Frontend Deployment
If you need to deploy the frontend separately:
1. Use Vercel for React/Next.js: `vercel --prod`
2. Or use static hosting (Netlify, GitHub Pages) for the public folder

## Production Checklist
- [ ] MongoDB Atlas cluster created
- [ ] Network access configured (0.0.0.0/0)
- [ ] GitHub repository created and pushed
- [ ] Vercel project imported
- [ ] Environment variables added in Vercel
- [ ] Project deployed successfully
- [ ] Endpoints tested and working
- [ ] Error logs reviewed

For more info: https://vercel.com/docs/concepts/functions/serverless-functions
