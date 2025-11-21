@echo off
REM Setup Docker Files for Investment Proposal Tool
REM This script copies the Docker files to the correct locations

echo ========================================
echo Investment Proposal Tool - Docker Setup
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: backend folder not found!
    echo Please run this script from the investment-proposal-fullstack directory
    echo.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: frontend folder not found!
    echo Please run this script from the investment-proposal-fullstack directory
    echo.
    pause
    exit /b 1
)

echo Step 1: Setting up backend Docker files...
echo.

REM Copy backend Dockerfile
if exist "backend-Dockerfile" (
    copy /Y "backend-Dockerfile" "backend\Dockerfile"
    echo ✓ Created backend\Dockerfile
) else (
    echo ERROR: backend-Dockerfile not found!
    echo Please make sure you downloaded all the Docker files to this directory
    pause
    exit /b 1
)

REM Copy backend .dockerignore
if exist "backend-dockerignore" (
    copy /Y "backend-dockerignore" "backend\.dockerignore"
    echo ✓ Created backend\.dockerignore
) else (
    echo WARNING: backend-dockerignore not found, skipping...
)

echo.
echo Step 2: Setting up frontend Docker files...
echo.

REM Copy frontend Dockerfile
if exist "frontend-Dockerfile" (
    copy /Y "frontend-Dockerfile" "frontend\Dockerfile"
    echo ✓ Created frontend\Dockerfile
) else (
    echo ERROR: frontend-Dockerfile not found!
    pause
    exit /b 1
)

REM Copy frontend .dockerignore
if exist "frontend-dockerignore" (
    copy /Y "frontend-dockerignore" "frontend\.dockerignore"
    echo ✓ Created frontend\.dockerignore
) else (
    echo WARNING: frontend-dockerignore not found, skipping...
)

REM Copy nginx.conf
if exist "nginx.conf" (
    copy /Y "nginx.conf" "frontend\nginx.conf"
    echo ✓ Created frontend\nginx.conf
) else (
    echo ERROR: nginx.conf not found!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Docker files have been created:
echo   backend\Dockerfile
echo   backend\.dockerignore
echo   frontend\Dockerfile
echo   frontend\.dockerignore
echo   frontend\nginx.conf
echo.
echo Next steps:
echo   1. Update backend\server.js to use PORT environment variable
echo   2. Test Docker builds locally (optional)
echo   3. Deploy to Google Cloud Run
echo.
echo Ready to continue with deployment!
echo.
pause
