@echo off
REM Quick Deploy Script for Plagiarism Checker (Windows)

echo.
echo ==========================================
echo Plagiarism Checker - Vercel Deployment
echo ==========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo XX Git is not installed. Please install git first.
    echo    Visit: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo XX npm is not installed. Please install Node.js first.
    echo    Visit: https://nodejs.org
    pause
    exit /b 1
)

echo OK Prerequisites found (git, npm)
echo.

REM Step 1: Install dependencies
echo Step 1: Installing dependencies...
call npm install

if errorlevel 1 (
    echo XX Failed to install dependencies
    pause
    exit /b 1
)
echo OK Dependencies installed successfully
echo.

REM Step 2: Initialize Git (if needed)
if not exist .git (
    echo Step 2: Initializing Git repository...
    call git init
    call git add .
    call git commit -m "Initial commit - ready for deployment"
    echo OK Git repository initialized
    echo.
    echo WARNING: Create a GitHub repository at https://github.com/new
    echo Then run these commands:
    echo    git remote add origin https://github.com/YOUR_USERNAME/your-repo-name.git
    echo    git branch -M main
    echo    git push -u origin main
) else (
    echo Step 2: Git repository already initialized
    echo OK Ready to push to GitHub
)
echo.

REM Step 3: Summary
echo ==========================================
echo Next Steps:
echo ==========================================
echo 1. Push to GitHub (if not done):
echo    git push origin main
echo.
echo 2. Go to https://vercel.com
echo 3. Click 'Add New' -^> 'Project'
echo 4. Import your GitHub repository
echo 5. Click 'Deploy'
echo.
echo 6. Add Environment Variables in Vercel Settings:
echo    - MONGODB_URI: Your MongoDB connection string
echo    - JWT_SECRET: A long random string (min 32 chars)
echo    - NODE_ENV: production
echo.
echo 7. Redeploy from Deployments tab
echo.
echo 8. Test at: https://your-project.vercel.app
echo ==========================================
echo.
echo OK Setup complete! Follow the next steps above.
echo.
pause
