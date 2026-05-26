#!/bin/bash
# Quick Deploy Script for Plagiarism Checker

# This script helps you deploy to Vercel quickly

echo "=========================================="
echo "Plagiarism Checker - Vercel Deployment"
echo "=========================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Prerequisites found (git, npm)"
echo ""

# Step 1: Install dependencies
echo "Step 1: Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Step 2: Initialize Git (if needed)
if [ ! -d .git ]; then
    echo "Step 2: Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - ready for deployment"
    echo "✅ Git repository initialized"
    echo ""
    echo "⚠️  Important: Create a GitHub repository at https://github.com/new"
    echo "Then run these commands:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/your-repo-name.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
else
    echo "Step 2: Git repository already initialized"
    echo "✅ Ready to push to GitHub"
fi
echo ""

# Step 3: Summary
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Push to GitHub (if not done):"
echo "   git push origin main"
echo ""
echo "2. Go to https://vercel.com"
echo "3. Click 'Add New' → 'Project'"
echo "4. Import your GitHub repository"
echo "5. Click 'Deploy'"
echo ""
echo "6. Add Environment Variables in Vercel Settings:"
echo "   - MONGODB_URI: Your MongoDB connection string"
echo "   - JWT_SECRET: A long random string (min 32 chars)"
echo "   - NODE_ENV: production"
echo ""
echo "7. Redeploy from Deployments tab"
echo ""
echo "8. Test at: https://your-project.vercel.app"
echo "=========================================="
echo ""
echo "✅ Setup complete! Follow the next steps above."
