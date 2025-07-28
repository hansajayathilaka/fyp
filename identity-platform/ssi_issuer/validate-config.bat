@echo off
REM SSI Issuer Platform - Configuration Validation Script

echo SSI Issuer Platform Configuration Validation
echo ============================================
echo.

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Docker is not installed or not in PATH
    goto :end
) else (
    echo [PASS] Docker is available
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Docker Compose is not installed or not in PATH
    goto :end
) else (
    echo [PASS] Docker Compose is available
)

echo.
echo Validating Docker Compose configurations...
echo.

REM Validate main production configuration
echo Testing docker-compose.yml...
docker-compose config --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] docker-compose.yml has syntax errors
    docker-compose config
) else (
    echo [PASS] docker-compose.yml is valid
)

REM Validate development configuration
echo Testing docker-compose.dev.yml...
docker-compose -f docker-compose.dev.yml config --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] docker-compose.dev.yml has syntax errors
    docker-compose -f docker-compose.dev.yml config
) else (
    echo [PASS] docker-compose.dev.yml is valid
)

REM Validate KERIA configuration
echo Testing docker-compose.keria.yml...
docker-compose -f docker-compose.keria.yml config --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] docker-compose.keria.yml has syntax errors
    docker-compose -f docker-compose.keria.yml config
) else (
    echo [PASS] docker-compose.keria.yml is valid
)

REM Validate witnesses configuration
echo Testing docker-compose.witnesses.yml...
docker-compose -f docker-compose.witnesses.yml config --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] docker-compose.witnesses.yml has syntax errors
    docker-compose -f docker-compose.witnesses.yml config
) else (
    echo [PASS] docker-compose.witnesses.yml is valid
)

REM Validate services configuration
echo Testing docker-compose.services.yml...
docker-compose -f docker-compose.services.yml config --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] docker-compose.services.yml has syntax errors
    docker-compose -f docker-compose.services.yml config
) else (
    echo [PASS] docker-compose.services.yml is valid
)

echo.
echo Checking environment configuration...
echo.

REM Check for environment files
if exist .env (
    echo [PASS] .env file exists
) else (
    echo [INFO] .env file not found - will use defaults
)

if exist config\.env.example (
    echo [PASS] config/.env.example exists
) else (
    echo [WARN] config/.env.example not found
)

if exist config\.env.dev (
    echo [PASS] config/.env.dev exists
) else (
    echo [WARN] config/.env.dev not found
)

echo.
echo Checking required directories...
echo.

if exist backend (
    echo [PASS] backend directory exists
) else (
    echo [WARN] backend directory not found
)

if exist admin-ui (
    echo [PASS] admin-ui directory exists
) else (
    echo [WARN] admin-ui directory not found
)

if exist public-ui (
    echo [PASS] public-ui directory exists
) else (
    echo [WARN] public-ui directory not found
)

if exist infrastructure\traefik (
    echo [PASS] infrastructure/traefik directory exists
) else (
    echo [WARN] infrastructure/traefik directory not found
)

echo.
echo Configuration validation complete!
echo.
echo Next steps:
echo 1. For development: run start-dev.bat
echo 2. For production: configure .env and run start-prod.bat
echo 3. Read DOCKER_SETUP.md for detailed documentation
echo.

:end
pause