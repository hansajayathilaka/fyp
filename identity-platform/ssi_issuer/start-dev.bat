@echo off
REM SSI Issuer Platform - Development Environment Startup Script

echo Starting SSI Issuer Platform Development Environment...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Copy development environment if .env doesn't exist
if not exist .env (
    echo Creating .env file from development template...
    copy config\.env.dev .env
    echo.
)

REM Start development services
echo Starting KERIA and witness services...
docker-compose -f docker-compose.dev.yml up -d

echo.
echo Development environment started successfully!
echo.
echo Services available at:
echo - KERIA Admin API: http://localhost:3901
echo - KERIA Boot API: http://localhost:3903
echo - MongoDB Database: mongodb://localhost:27017
echo - Witness 0: http://localhost:5621
echo - Witness 1: http://localhost:5622
echo - Witness 2: http://localhost:5623
echo - Witness 3: http://localhost:5624
echo - Witness 4: http://localhost:5625
echo - Witness 5: http://localhost:5626
echo - Backend API: http://localhost:3000 (if enabled)
echo - Admin UI: http://localhost:3001 (if enabled)
echo - Public UI: http://localhost:3002 (if enabled)
echo.
echo To view logs: docker-compose -f docker-compose.dev.yml logs -f
echo To stop: docker-compose -f docker-compose.dev.yml down
echo.
pause