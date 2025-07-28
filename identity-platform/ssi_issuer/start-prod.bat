@echo off
REM SSI Issuer Platform - Production Environment Startup Script

echo Starting SSI Issuer Platform Production Environment...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if .env exists
if not exist .env (
    echo ERROR: .env file not found. Please create one from config/.env.example
    echo and configure your domain and other production settings.
    pause
    exit /b 1
)

REM Load environment variables
for /f "delims=" %%x in (.env) do (set "%%x")

REM Validate required environment variables
if "%DOMAIN%"=="" (
    echo ERROR: DOMAIN environment variable is required for production.
    pause
    exit /b 1
)

if "%JWT_SECRET%"=="" (
    echo ERROR: JWT_SECRET environment variable is required for production.
    pause
    exit /b 1
)

REM Start production services
echo Starting production services with Traefik...
docker-compose --profile production up -d

echo.
echo Production environment started successfully!
echo.
echo Services available at:
echo - Public Interface: https://ssi-issuer.%DOMAIN%
echo - Admin Dashboard: https://ssi-issuer-admin.%DOMAIN%
echo - API: https://ssi-issuer-api.%DOMAIN%
echo - Traefik Dashboard: https://ssi-issuer-traefik.%DOMAIN%
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose --profile production down
echo.
pause