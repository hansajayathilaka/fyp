@echo off
REM Traefik Configuration Validation Script
REM Validates Traefik configuration files and Docker Compose setup

echo ========================================
echo SSI Issuer Platform - Traefik Validation
echo ========================================
echo.

REM Check if required files exist
echo [1/6] Checking configuration files...
if not exist "infrastructure\traefik\traefik.yml" (
    echo ERROR: traefik.yml not found
    goto :error
)
if not exist "infrastructure\traefik\dynamic.yml" (
    echo ERROR: dynamic.yml not found
    goto :error
)
if not exist "infrastructure\traefik\traefik.dev.yml" (
    echo ERROR: traefik.dev.yml not found
    goto :error
)
echo ✓ All Traefik configuration files found

REM Check Docker Compose files
echo.
echo [2/6] Checking Docker Compose files...
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found
    goto :error
)
if not exist "docker-compose.services.yml" (
    echo ERROR: docker-compose.services.yml not found
    goto :error
)
if not exist "docker-compose.dev.yml" (
    echo ERROR: docker-compose.dev.yml not found
    goto :error
)
echo ✓ All Docker Compose files found

REM Validate Docker Compose syntax
echo.
echo [3/6] Validating Docker Compose syntax...
docker-compose config > nul 2>&1
if errorlevel 1 (
    echo ERROR: docker-compose.yml has syntax errors
    docker-compose config
    goto :error
)
echo ✓ Production Docker Compose syntax valid

docker-compose -f docker-compose.dev.yml config > nul 2>&1
if errorlevel 1 (
    echo ERROR: docker-compose.dev.yml has syntax errors
    docker-compose -f docker-compose.dev.yml config
    goto :error
)
echo ✓ Development Docker Compose syntax valid

REM Check environment files
echo.
echo [4/6] Checking environment configuration...
if not exist ".env.example" (
    echo WARNING: .env.example not found
) else (
    echo ✓ .env.example found
)
if not exist ".env.dev" (
    echo WARNING: .env.dev not found
) else (
    echo ✓ .env.dev found
)
if not exist ".env" (
    echo WARNING: .env not found - copy from .env.example for production
) else (
    echo ✓ .env found
)

REM Check Docker network
echo.
echo [5/6] Checking Docker networks...
docker network ls | findstr traefik > nul 2>&1
if errorlevel 1 (
    echo INFO: Creating external traefik network...
    docker network create traefik
    if errorlevel 1 (
        echo ERROR: Failed to create traefik network
        goto :error
    )
    echo ✓ Traefik network created
) else (
    echo ✓ Traefik network exists
)

REM Test Traefik configuration
echo.
echo [6/6] Testing Traefik configuration...
echo Testing production configuration...
docker run --rm -v "%cd%\infrastructure\traefik\traefik.yml:/traefik.yml" traefik:v3.0 traefik --configfile=/traefik.yml --dry-run > nul 2>&1
if errorlevel 1 (
    echo ERROR: Production Traefik configuration invalid
    docker run --rm -v "%cd%\infrastructure\traefik\traefik.yml:/traefik.yml" traefik:v3.0 traefik --configfile=/traefik.yml --dry-run
    goto :error
)
echo ✓ Production Traefik configuration valid

echo Testing development configuration...
docker run --rm -v "%cd%\infrastructure\traefik\traefik.dev.yml:/traefik.yml" traefik:v3.0 traefik --configfile=/traefik.yml --dry-run > nul 2>&1
if errorlevel 1 (
    echo ERROR: Development Traefik configuration invalid
    docker run --rm -v "%cd%\infrastructure\traefik\traefik.dev.yml:/traefik.yml" traefik:v3.0 traefik --configfile=/traefik.yml --dry-run
    goto :error
)
echo ✓ Development Traefik configuration valid

echo.
echo ========================================
echo ✓ All validations passed!
echo ========================================
echo.
echo Next steps:
echo 1. Copy .env.example to .env and configure your domain
echo 2. Set DOMAIN and TRAEFIK_EMAIL in .env
echo 3. Start production: docker-compose --profile production up -d
echo 4. Start development: docker-compose -f docker-compose.dev.yml up -d
echo.
goto :end

:error
echo.
echo ========================================
echo ✗ Validation failed!
echo ========================================
echo Please fix the errors above and run again.
echo.
exit /b 1

:end
exit /b 0